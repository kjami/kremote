import * as SecureStore from 'expo-secure-store';
import { ConnectionStatus, Device, DeviceApp, RemoteKey } from '../../types';
import { SONY_APPS, SONY_IRCC } from '../../constants/commands';
import { IDeviceService } from './IDeviceService';

const IRCC_SERVICE = 'urn:schemas-sony-com:service:IRCC:1';
const CLIENT_ID = 'tv-remote:1';
const CLIENT_NICK = 'TV Remote';

function ircSoap(code: string): string {
  return `<?xml version="1.0"?>\
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" \
s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">\
<s:Body><u:X_SendIRCC xmlns:u="${IRCC_SERVICE}">\
<IRCCCode>${code}</IRCCCode></u:X_SendIRCC></s:Body></s:Envelope>`;
}

function actRegisterBody() {
  return JSON.stringify({
    method: 'actRegister',
    params: [
      { clientid: CLIENT_ID, nickname: CLIENT_NICK, level: 'private' },
      [{ value: 'yes', function: 'WOL' }],
    ],
    id: 1,
    version: '1.0',
  });
}

// Promise-returning callback the UI registers with the manager.
export type PinPrompt = () => Promise<string>;

function cookieKey(host: string): string {
  return `sony_auth_cookie_${host.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

export class SonyBraviaService implements IDeviceService {
  private status: ConnectionStatus = { isConnected: false, isConnecting: false };
  private baseUrl: string;
  private cookie: string | null = null;
  private connectInFlight: Promise<void> | null = null;
  private appsCache: { apps: DeviceApp[]; ts: number } | null = null;
  private static APP_CACHE_TTL_MS = 5 * 60 * 1000;
  // Rate-limit PIN entry: cooldown after MAX consecutive failures.
  private static MAX_PIN_ATTEMPTS = 3;
  private static PIN_COOLDOWN_MS = 60 * 1000;
  private pinFailures = 0;
  private pinCooldownUntil = 0;

  constructor(private device: Device, private requestPin: PinPrompt) {
    this.baseUrl = `http://${device.ip}`;
  }

  async connect(): Promise<void> {
    if (this.connectInFlight) return this.connectInFlight;
    this.status = { isConnected: false, isConnecting: true };
    this.connectInFlight = (async () => {
      try {
        await this.ensureAuth();
        this.status = { isConnected: true, isConnecting: false };
      } catch (e) {
        this.status = { isConnected: false, isConnecting: false, error: (e as Error).message };
        throw e;
      } finally {
        this.connectInFlight = null;
      }
    })();
    return this.connectInFlight;
  }

  private async ensureAuth(): Promise<void> {
    // Try cached cookie first
    if (!this.cookie) {
      this.cookie = await SecureStore.getItemAsync(cookieKey(this.device.ip));
    }
    if (this.cookie && (await this.cookieStillValid())) {
      console.log('[Sony] reusing cached auth cookie');
      return;
    }
    console.log('[Sony] no valid cookie — starting PIN registration');
    this.cookie = null;
    await this.registerWithPin();
  }

  private async cookieStillValid(): Promise<boolean> {
    if (!this.cookie) return false;
    try {
      const res = await fetch(`${this.baseUrl}/sony/system`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: this.cookie },
        body: JSON.stringify({ method: 'getSystemInformation', id: 1, params: [], version: '1.0' }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private async registerWithPin(): Promise<void> {
    const now = Date.now();
    if (this.pinCooldownUntil > now) {
      const secs = Math.ceil((this.pinCooldownUntil - now) / 1000);
      throw new Error(`Too many failed PIN attempts. Try again in ${secs}s.`);
    }
    // Step 1: actRegister with no auth — expect 401 + WWW-Authenticate.
    // Side effect: TV displays a 4-digit PIN on screen.
    console.log('[Sony] step 1 — sending actRegister (no auth) to trigger PIN display');
    const res1 = await fetch(`${this.baseUrl}/sony/accessControl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: actRegisterBody(),
    });
    if (res1.status !== 401) {
      // 200 means already trusted — no PIN needed (but no Set-Cookie usually)
      if (res1.ok) {
        console.log('[Sony] actRegister returned 200 — already trusted');
        const sc = res1.headers.get('set-cookie');
        if (sc) this.cookie = parseCookie(sc);
        if (this.cookie) await SecureStore.setItemAsync(cookieKey(this.device.ip), this.cookie);
        return;
      }
      throw new Error(`Sony actRegister: expected 401, got ${res1.status}`);
    }
    console.log('[Sony] step 1 ✓ TV should now display a 4-digit PIN');

    // Step 2: prompt user, then re-send with Basic auth
    const pin = (await this.requestPin()).trim();
    if (!/^\d{4}$/.test(pin)) throw new Error('PIN must be 4 digits');
    console.log('[Sony] step 2 — re-sending actRegister with Basic auth');

    const basic = base64Encode(`:${pin}`);
    const res2 = await fetch(`${this.baseUrl}/sony/accessControl`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${basic}`,
      },
      body: actRegisterBody(),
    });
    if (!res2.ok) {
      this.pinFailures++;
      if (this.pinFailures >= SonyBraviaService.MAX_PIN_ATTEMPTS) {
        this.pinCooldownUntil = Date.now() + SonyBraviaService.PIN_COOLDOWN_MS;
        this.pinFailures = 0;
        throw new Error(`PIN incorrect ${SonyBraviaService.MAX_PIN_ATTEMPTS}× in a row. Cooling down 60s.`);
      }
      const t = await res2.text().catch(() => '');
      throw new Error(`Sony PIN auth: ${res2.status} ${t.slice(0, 100)}`);
    }
    this.pinFailures = 0;

    const setCookie = res2.headers.get('set-cookie');
    if (!setCookie) throw new Error('Sony PIN auth: no Set-Cookie returned');
    this.cookie = parseCookie(setCookie);
    if (!this.cookie) throw new Error('Sony PIN auth: empty cookie');
    await SecureStore.setItemAsync(cookieKey(this.device.ip), this.cookie);
    console.log('[Sony] step 2 ✓ paired, cookie saved');
  }

  async disconnect(): Promise<void> {
    this.status = { isConnected: false, isConnecting: false };
  }

  async sendKey(key: RemoteKey): Promise<void> {
    if (!this.cookie) await this.connect();
    const code = SONY_IRCC[key];
    if (!code) return;
    const res = await fetch(`${this.baseUrl}/sony/IRCC`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPACTION: `"${IRCC_SERVICE}#X_SendIRCC"`,
        Cookie: this.cookie ?? '',
      },
      body: ircSoap(code),
    });
    if (res.status === 403) {
      // Cookie expired — wipe and retry once after fresh PIN
      console.warn('[Sony] IRCC 403 — cookie likely expired, re-authenticating');
      this.cookie = null;
      await SecureStore.deleteItemAsync(cookieKey(this.device.ip));
      await this.connect();
      await this.sendKey(key);
      return;
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const flat = body.replace(/\s+/g, ' ').trim();
      // Pull out just the SOAP faultstring/UPnPError fragment if present.
      const faultStr = flat.match(/<faultstring>(.*?)<\/faultstring>/)?.[1] ?? '';
      const errCode  = flat.match(/<errorCode>(.*?)<\/errorCode>/)?.[1] ?? '';
      const errDesc  = flat.match(/<errorDescription>(.*?)<\/errorDescription>/)?.[1] ?? '';
      console.warn(`[Sony] IRCC ${res.status}: faultstring="${faultStr}" errCode=${errCode} errDesc="${errDesc}"`);
      console.warn(`[Sony] IRCC full body (first 600 chars): ${flat.slice(0, 600)}`);
      const summary = faultStr || errDesc || flat.slice(0, 120);
      throw new Error(`Sony IRCC ${res.status}: ${summary}`);
    }
  }

  async launchApp(appId: string): Promise<void> {
    if (!this.cookie) await this.connect();
    // appId may be a real Sony URI (from listApps) or one of our preset IDs.
    const uri = appId.startsWith('com.') || appId.includes('://')
      ? appId
      : (SONY_APPS[appId] ? `localapp://webapps/${SONY_APPS[appId]}` : appId);
    await fetch(`${this.baseUrl}/sony/appControl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: this.cookie ?? '' },
      body: JSON.stringify({
        method: 'setActiveApp',
        id: 601,
        params: [{ uri }],
        version: '1.0',
      }),
    });
  }

  async listApps(): Promise<DeviceApp[]> {
    const now = Date.now();
    if (this.appsCache && now - this.appsCache.ts < SonyBraviaService.APP_CACHE_TTL_MS) {
      return this.appsCache.apps;
    }
    if (!this.cookie) await this.connect();
    const res = await fetch(`${this.baseUrl}/sony/appControl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: this.cookie ?? '' },
      body: JSON.stringify({ method: 'getApplicationList', id: 60, params: [], version: '1.0' }),
    });
    if (!res.ok) throw new Error(`Sony getApplicationList ${res.status}`);
    const json = await res.json() as { result?: any[]; error?: any };
    if (json.error) throw new Error(`Sony getApplicationList: ${JSON.stringify(json.error)}`);
    const list = (json.result?.[0] ?? []) as Array<{ title: string; uri: string; icon?: string }>;
    const apps: DeviceApp[] = list.map(a => ({
      id: a.uri,
      name: a.title,
      uri: a.uri,
      iconUrl: a.icon,
    }));
    this.appsCache = { apps, ts: now };
    return apps;
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }
}

// Extract just the cookie name=value pair (drop attributes)
function parseCookie(setCookie: string): string | null {
  // setCookie may be a comma-separated multi-cookie list (RN concat'd headers)
  const first = setCookie.split(/,(?=\s*\w+=)/)[0];
  const pair = first.split(';')[0].trim();
  return pair || null;
}

// Pure-JS base64 (avoids Buffer dependency at this layer)
function base64Encode(s: string): string {
  if (typeof btoa === 'function') return btoa(s);
  // Fallback: use Buffer (which we polyfilled in App.tsx)
  // @ts-ignore
  return Buffer.from(s, 'utf-8').toString('base64');
}
