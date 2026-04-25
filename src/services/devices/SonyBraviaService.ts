import { ConnectionStatus, Device, RemoteKey } from '../../types';
import { SONY_APPS, SONY_IRCC } from '../../constants/commands';
import { IDeviceService } from './IDeviceService';

const IRCC_SERVICE = 'urn:schemas-sony-com:service:IRCC:1';

function buildIrccSoap(code: string): string {
  return `<?xml version="1.0"?>\
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" \
s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">\
<s:Body><u:X_SendIRCC xmlns:u="${IRCC_SERVICE}">\
<IRCCCode>${code}</IRCCCode></u:X_SendIRCC></s:Body></s:Envelope>`;
}

export class SonyBraviaService implements IDeviceService {
  private status: ConnectionStatus = { isConnected: false, isConnecting: false };
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(private device: Device) {
    this.baseUrl = `http://${device.ip}`;
    this.headers = {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPACTION': `"${IRCC_SERVICE}#X_SendIRCC"`,
      ...(device.authKey ? { 'X-Auth-PSK': device.authKey } : {}),
    };
  }

  async connect(): Promise<void> {
    this.status = { isConnected: false, isConnecting: true };
    try {
      const res = await fetch(`${this.baseUrl}/sony/system`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(this.device.authKey ? { 'X-Auth-PSK': this.device.authKey } : {}) },
        body: JSON.stringify({ method: 'getSystemInformation', id: 1, params: [], version: '1.0' }),
      });
      if (res.ok) {
        this.status = { isConnected: true, isConnecting: false };
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e) {
      this.status = { isConnected: false, isConnecting: false, error: (e as Error).message };
      throw e;
    }
  }

  async disconnect(): Promise<void> {
    this.status = { isConnected: false, isConnecting: false };
  }

  async sendKey(key: RemoteKey): Promise<void> {
    const code = SONY_IRCC[key];
    if (!code) return;
    await fetch(`${this.baseUrl}/sony/IRCC`, {
      method: 'POST',
      headers: this.headers,
      body: buildIrccSoap(code),
    });
  }

  async launchApp(appId: string): Promise<void> {
    const packageName = SONY_APPS[appId];
    if (!packageName) return;
    await fetch(`${this.baseUrl}/sony/appControl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(this.device.authKey ? { 'X-Auth-PSK': this.device.authKey } : {}) },
      body: JSON.stringify({
        method: 'setActiveApp',
        id: 601,
        params: [{ uri: `localapp://webapps/${packageName}` }],
        version: '1.0',
      }),
    });
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }
}
