import TcpSocket from 'react-native-tcp-socket';
import forge from 'node-forge';
import {
  encode, decode, frame, decodeVarint,
  getVarint, getBytes,
  PMT, PAIR_STATUS_OK, ENC_HEXADECIMAL, ROLE_INPUT, DIR_SHORT,
} from './proto';
import * as SecureStore from 'expo-secure-store';
import {
  loadOrCreateIdentity, getRsaParts,
  pairedKey,
  ClientIdentity,
} from './cert';

// Some events the UI listens for
type Listener<T> = (e: T) => void;

export interface GoogleTvCallbacks {
  onPairingCodeRequired: () => Promise<string>;  // resolves with hex code from TV
  onError?: (msg: string) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

const PAIR_PORT = 6467;
const CTRL_PORT = 6466;
const PINNED_CERT_PREFIX = 'gtv_pinned_cert_';

function pinnedCertKey(host: string): string {
  return PINNED_CERT_PREFIX + host.replace(/[^a-zA-Z0-9]/g, '_');
}

export class GoogleTvClient {
  private identity!: ClientIdentity;
  private serverModulus: Uint8Array | null = null;
  private serverExponent: Uint8Array | null = null;
  // If first attempt with client cert silently fails the TLS handshake,
  // we retry without it. Pairing-hash will then need a different secret path,
  // but at least we'll know the cert is the cause.
  private skipClientCert: boolean = false;

  private socket: ReturnType<typeof TcpSocket.connectTLS> | null = null;
  private recvBuf: Uint8Array = new Uint8Array(0);
  private connected = false;
  private msgQueue: ((m: Map<number, any>) => void)[] = [];

  constructor(private host: string, private cb: GoogleTvCallbacks) {}

  isConnected(): boolean { return this.connected; }

  private probePort(port: number, timeoutMs = 3000): Promise<{ ok: boolean; reason: string }> {
    return new Promise((resolve) => {
      const t = setTimeout(() => {
        try { sock.destroy(); } catch {}
        resolve({ ok: false, reason: 'timeout' });
      }, timeoutMs);
      const sock = TcpSocket.createConnection({ host: this.host, port } as any, () => {
        clearTimeout(t);
        sock.destroy();
        resolve({ ok: true, reason: 'connected' });
      });
      sock.on('error', (err: any) => {
        clearTimeout(t);
        resolve({ ok: false, reason: err?.message ?? 'error' });
      });
    });
  }

  private async multiPortProbe(ports: number[]): Promise<void> {
    console.log(`[GoogleTV] probing TV at ${this.host} across ports: ${ports.join(', ')}`);
    const results: Record<number, { ok: boolean; reason: string }> = {};
    for (const p of ports) {
      results[p] = await this.probePort(p);
      console.log(`[GoogleTV]   port ${p}: ${results[p].ok ? '✓ open' : '✗ ' + results[p].reason}`);
    }
    if (!results[6467]?.ok) {
      const openPorts = Object.entries(results).filter(([, r]) => r.ok).map(([p]) => p);
      throw new Error(
        `Port 6467 (Android TV Remote pairing) not reachable. ` +
        `Open ports: ${openPorts.length ? openPorts.join(', ') : 'none'}. ` +
        `Your TV may not have Google's remote service enabled.`
      );
    }
  }

  async connect(): Promise<void> {
    // Diagnostic: see which ports on the TV are reachable from this phone.
    // (Helps isolate "wrong network" vs "this specific port is blocked".)
    await this.multiPortProbe([80, 8008, 8080, 6466, 6467]);
    console.log('[GoogleTV] loading client identity (may take 2-3s on first run)…');
    this.identity = await loadOrCreateIdentity();
    const pkey = pairedKey(this.host);
    const alreadyPaired = await SecureStore.getItemAsync(pkey);
    if (!alreadyPaired) {
      console.log('[GoogleTV] no stored pairing for', this.host, '— starting pairing flow');
      await this.runPairing();
      await SecureStore.setItemAsync(pkey, '1');
      // After successful pairing, pin the server's cert fingerprint so we
      // can detect a MITM on subsequent connects (TV cert is self-signed
      // so we can't rely on the system trust store).
      const fp = await this.getCurrentPeerFingerprint();
      if (fp) {
        await SecureStore.setItemAsync(pinnedCertKey(this.host), fp);
        console.log('[GoogleTV] pinned TV cert fingerprint:', fp.slice(0, 16) + '…');
      }
      console.log('[GoogleTV] pairing complete, opening control channel');
    } else {
      console.log('[GoogleTV] device already paired, opening control channel directly');
    }
    await this.openControl();
    // Verify the control-channel cert matches the pinned one.
    await this.verifyPinnedCert();
    console.log('[GoogleTV] control channel established');
  }

  private async getCurrentPeerFingerprint(): Promise<string | null> {
    try {
      const peer = await (this.socket as any)?.getPeerCertificate?.();
      return peer?.fingerprint256 ?? peer?.fingerprint ?? null;
    } catch {
      return null;
    }
  }

  private async verifyPinnedCert(): Promise<void> {
    const expected = await SecureStore.getItemAsync(pinnedCertKey(this.host));
    if (!expected) return; // no pin yet (e.g. legacy install)
    const actual = await this.getCurrentPeerFingerprint();
    if (!actual) return;
    if (actual !== expected) {
      this.disconnect();
      throw new Error(
        `TV cert fingerprint changed (possible MITM). ` +
        `Expected ${expected.slice(0, 16)}…, got ${actual.slice(0, 16)}…. ` +
        `Use "Forget device" to re-pair if the TV was reset.`
      );
    }
  }

  disconnect(): void {
    this.socket?.destroy();
    this.socket = null;
    this.connected = false;
    this.cb.onDisconnected?.();
  }

  // ---------- public commands ----------

  async sendKey(keyCode: number): Promise<void> {
    if (!this.connected) throw new Error('Not connected to Google TV');
    // RemoteMessage { remote_key_inject = field 22 }
    // RemoteRemoteKeyInject { keyCode = 1 (varint), direction = 2 (varint, 3=SHORT) }
    const inner = encode([
      { f: 1, t: 'varint', v: keyCode },
      { f: 2, t: 'varint', v: DIR_SHORT },
    ]);
    const msg = encode([{ f: 22, t: 'message', v: inner }]);
    this.write(frame(msg));
  }

  async launchAppLink(uri: string): Promise<void> {
    if (!this.connected) throw new Error('Not connected to Google TV');
    // RemoteMessage { remote_app_link_launch_request = field 90 }
    // RemoteAppLinkLaunchRequest { app_link = 1 (string) }
    const inner = encode([{ f: 1, t: 'string', v: uri }]);
    const msg   = encode([{ f: 90, t: 'message', v: inner }]);
    this.write(frame(msg));
  }

  // ---------- pairing ----------

  private runPairing(): Promise<void> {
    return new Promise((resolve, reject) => {
      const overallTimeout = setTimeout(() => {
        console.warn('[GoogleTV] pairing timed out after 60s — TV did not respond');
        try { this.socket?.destroy(); } catch {}
        reject(new Error('Pairing timed out (60s) — check TV is on'));
      }, 60_000);
      const finish = (fn: () => void) => { clearTimeout(overallTimeout); fn(); };

      const sock = this.openSocket(PAIR_PORT, async () => {
        console.log('[GoogleTV] TLS established to pairing port');
        try {
          // 1. PairingRequest
          console.log('[GoogleTV] step 1/4 — sending PairingRequest');
          await this.sendPairingMessage(sock, PMT.PAIRING_REQUEST, encode([
            { f: 10, t: 'message', v: encode([
              { f: 1, t: 'string', v: 'androidtvremote' },
              { f: 2, t: 'string', v: 'tv-remote' },
            ]) },
          ]));
          await this.expectPairingMessage(PMT.PAIRING_REQUEST_ACK, 10_000);
          console.log('[GoogleTV] step 1/4 ✓ got PairingRequestAck');

          // 2. Options — TV echoes our Options message back as ack
          console.log('[GoogleTV] step 2/4 — sending Options');
          const encoding = encode([
            { f: 1, t: 'enum',  v: ENC_HEXADECIMAL },
            { f: 2, t: 'varint', v: 6 },
          ]);
          await this.sendPairingMessage(sock, PMT.OPTIONS, encode([
            { f: 20, t: 'message', v: encode([
              { f: 1, t: 'message', v: encoding },
              { f: 2, t: 'message', v: encoding },
              { f: 3, t: 'enum',    v: ROLE_INPUT },
            ]) },
          ]));
          await this.expectPairingMessage(PMT.OPTIONS, 10_000);
          console.log('[GoogleTV] step 2/4 ✓ TV accepted Options');

          // 3. Configuration — we send our chosen encoding, TV responds with ConfigurationAck
          console.log('[GoogleTV] step 3/4 — sending Configuration');
          await this.sendPairingMessage(sock, PMT.CONFIGURATION, encode([
            { f: 30, t: 'message', v: encode([
              { f: 1, t: 'message', v: encoding },
              { f: 2, t: 'enum',    v: ROLE_INPUT },
            ]) },
          ]));
          await this.expectPairingMessage(PMT.CONFIGURATION_ACK, 15_000);
          console.log('[GoogleTV] step 3/4 ✓ got ConfigurationAck — TV should now display code');

          // 3. ConfigurationAck
          await this.sendPairingMessage(sock, PMT.CONFIGURATION_ACK, encode([
            { f: 31, t: 'message', v: new Uint8Array(0) },
          ]));

          // 4. Wait for user to enter code shown on TV
          const code = (await this.cb.onPairingCodeRequired()).trim().replace(/\s/g, '');
          if (!/^[0-9a-fA-F]+$/.test(code)) throw new Error('Code must be hex');

          // Compute SHA-256(client_n | client_e | server_n | server_e | code[1..])
          const codeBytes = hexToBytes(code);
          if (codeBytes.length < 2) throw new Error('Code too short');
          const codeMinusFirst = codeBytes.slice(1);

          const client = getRsaParts(this.identity.certPem);
          if (!this.serverModulus || !this.serverExponent) {
            throw new Error('Missing server cert info');
          }

          const md = forge.md.sha256.create();
          md.update(uint8ToBinary(client.modulus));
          md.update(uint8ToBinary(client.exponent));
          md.update(uint8ToBinary(this.serverModulus));
          md.update(uint8ToBinary(this.serverExponent));
          md.update(uint8ToBinary(codeMinusFirst));
          const digestBin = md.digest().getBytes();
          const digest = new Uint8Array(digestBin.length);
          for (let i = 0; i < digest.length; i++) digest[i] = digestBin.charCodeAt(i);

          // 5. Send Secret
          await this.sendPairingMessage(sock, PMT.SECRET, encode([
            { f: 40, t: 'message', v: encode([{ f: 1, t: 'bytes', v: digest }]) },
          ]));
          const ack = await this.expectPairingMessage(PMT.SECRET_ACK);
          if (!ack) throw new Error('Pairing ack missing');

          sock.destroy();
          this.socket = null;
          this.recvBuf = new Uint8Array(0);
          resolve();
        } catch (e) {
          sock.destroy();
          this.socket = null;
          this.recvBuf = new Uint8Array(0);
          reject(e);
        }
      });

      sock.on('error', (err: Error) => reject(err));
    });
  }

  private async sendPairingMessage(sock: any, type: number, payload: Uint8Array): Promise<void> {
    // PairingMessage envelope: protocol_version=2 (1), status=200 (2), type=N (3), inner...
    // (Newer Sony Google TVs reject protocol_version=1 with a status 400 generic error.)
    const env = encode([
      { f: 1, t: 'varint', v: 2 },
      { f: 2, t: 'enum',   v: PAIR_STATUS_OK },
      { f: 3, t: 'enum',   v: type },
    ]);
    const merged = new Uint8Array(env.length + payload.length);
    merged.set(env, 0);
    merged.set(payload, env.length);
    sock.write(Buffer.from(frame(merged)) as unknown as string);
  }

  private async expectPairingMessage(expectedType: number, timeoutMs = 8000): Promise<Map<number, any>> {
    const msg = await Promise.race([
      this.nextMessage(),
      new Promise<Map<number, any>>((_, rej) =>
        setTimeout(() => rej(new Error(`Timed out waiting for pairing type ${expectedType}`)), timeoutMs),
      ),
    ]);
    const status = getVarint(msg, 2);
    if (status !== PAIR_STATUS_OK) throw new Error(`Pairing status ${status}`);
    // Some TVs omit the explicit `type` field (3) and just include the typed
    // submessage at its own field number. Accept either: matching `type=N`
    // OR presence of the submessage at the expected field.
    const type = getVarint(msg, 3);
    const subFieldByType: Record<number, number> = {
      [PMT.PAIRING_REQUEST]:     10,
      [PMT.PAIRING_REQUEST_ACK]: 11,
      [PMT.OPTIONS]:             20,
      [PMT.CONFIGURATION]:       30,
      [PMT.CONFIGURATION_ACK]:   31,
      [PMT.SECRET]:              40,
      [PMT.SECRET_ACK]:          41,
    };
    const expectedSubField = subFieldByType[expectedType];
    const hasSub = expectedSubField !== undefined && msg.has(expectedSubField);
    if (type !== expectedType && !hasSub) {
      throw new Error(`Expected type ${expectedType} (field ${expectedSubField}), got type=${type}, fields=${Array.from(msg.keys()).join(',')}`);
    }
    return msg;
  }

  // ---------- control channel ----------

  private openControl(): Promise<void> {
    return new Promise((resolve, reject) => {
      let configured = false;
      const sock = this.openSocket(CTRL_PORT, () => {
        // Server initiates with RemoteConfigure — we just respond as needed.
      });

      // Hook a one-off message handler — we resolve once we see the second SetActive
      const origOnMessage = (msg: Map<number, any>) => {
        // RemoteConfigure (field 1): respond with our own RemoteConfigure
        if (msg.has(1) && !configured) {
          configured = true;
          const deviceInfo = encode([
            { f: 1, t: 'string', v: 'tv-remote' },
            { f: 2, t: 'string', v: 'TV Remote' },
            { f: 3, t: 'varint', v: 1 },
            { f: 4, t: 'string', v: '1' },
            { f: 5, t: 'string', v: 'com.tvremote.app' },
            { f: 6, t: 'string', v: '1.0.0' },
          ]);
          const cfg = encode([
            { f: 1, t: 'varint', v: 622 },
            { f: 2, t: 'message', v: deviceInfo },
          ]);
          this.write(frame(encode([{ f: 1, t: 'message', v: cfg }])));
        }
        // RemoteSetActive (field 2): echo back
        if (msg.has(2)) {
          const setActive = encode([{ f: 1, t: 'varint', v: 622 }]);
          this.write(frame(encode([{ f: 2, t: 'message', v: setActive }])));
          if (!this.connected) {
            this.connected = true;
            this.cb.onConnected?.();
            resolve();
          }
        }
        // RemotePingRequest (field 7): respond with PingResponse (field 8)
        if (msg.has(7)) {
          const ping = msg.get(7)![0];
          if (ping.value instanceof Uint8Array) {
            const inner = decode(ping.value);
            const v = getVarint(inner, 1) ?? 0;
            const resp = encode([{ f: 1, t: 'varint', v }]);
            this.write(frame(encode([{ f: 8, t: 'message', v: resp }])));
          }
        }
      };
      this.controlHandler = origOnMessage;

      sock.on('error', (err: Error) => {
        if (!this.connected) reject(err);
        else this.cb.onError?.(err.message);
      });
      sock.on('close', () => { this.connected = false; this.cb.onDisconnected?.(); });

      setTimeout(() => {
        if (!this.connected) { sock.destroy(); reject(new Error('Control handshake timeout')); }
      }, 8000);
    });
  }

  private controlHandler: ((m: Map<number, any>) => void) | null = null;

  // ---------- TLS socket plumbing ----------

  private openSocket(port: number, onOpen: () => void) {
    this.recvBuf = new Uint8Array(0);
    console.log(`[GoogleTV] -> opening TLS to ${this.host}:${port} (cert len=${this.identity.certPem.length}, key len=${this.identity.keyPem.length})`);
    const handshakeTimer = setTimeout(() => {
      console.warn(`[GoogleTV] !! TLS handshake to ${this.host}:${port} did not complete within 10s — destroying socket`);
      try { sock.destroy(); } catch {}
    }, 10_000);
    // Note: the TV doesn't actually require a client cert at the TLS layer
    // — it uses the cert only for the application-level pairing hash. So we
    // can connect without one, which sidesteps Android keystore quirks.
    const tlsOpts: any = { host: this.host, port, rejectUnauthorized: false };
    if (!this.skipClientCert) {
      tlsOpts.cert = this.identity.certPem;
      tlsOpts.key  = this.identity.keyPem;
    } else {
      console.log('[GoogleTV] DEBUG: connecting WITHOUT client cert');
    }
    const sock = TcpSocket.connectTLS(tlsOpts, async () => {
      clearTimeout(handshakeTimer);
      console.log(`[GoogleTV] ✓ secureConnect on port ${port}`);
      // Capture the server's RSA modulus/exponent for the pairing hash.
      try {
        const peer = await (sock as any).getPeerCertificate?.();
        if (peer?.modulus && peer?.exponent) {
          this.serverModulus  = hexToBytes(stripPrefix(peer.modulus));
          this.serverExponent = hexToBytes(stripPrefix(peer.exponent));
        }
      } catch { /* server cert capture is only needed during pairing */ }
      onOpen();
    });

    this.socket = sock;

    sock.on('data', (raw: any) => {
      const chunk = typeof raw === 'string'
        ? new TextEncoder().encode(raw)
        : new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
      console.log(`[GoogleTV] <- recv ${chunk.length} bytes on port ${port}`);
      this.feed(chunk);
    });

    sock.on('connect', () => {
      console.log(`[GoogleTV] ✓ TCP connect on port ${port}`);
    });

    sock.on('error', (err: any) => {
      clearTimeout(handshakeTimer);
      const msg = err?.message ?? err?.toString?.() ?? '(no message)';
      console.warn(`[GoogleTV] !! socket error on port ${port}: ${msg}`);
      try { console.warn('[GoogleTV] error keys:', Object.keys(err || {})); } catch {}
    });

    sock.on('close', (hadError: boolean) => {
      clearTimeout(handshakeTimer);
      console.log(`[GoogleTV] socket closed on port ${port} (hadError=${hadError})`);
    });

    return sock;
  }

  private write(data: Uint8Array): void {
    this.socket?.write(Buffer.from(data) as unknown as string);
  }

  private feed(chunk: Uint8Array): void {
    const merged = new Uint8Array(this.recvBuf.length + chunk.length);
    merged.set(this.recvBuf, 0);
    merged.set(chunk, this.recvBuf.length);
    this.recvBuf = merged;

    while (this.recvBuf.length > 0) {
      let lenInfo;
      try { lenInfo = decodeVarint(this.recvBuf, 0); } catch { return; }
      const total = lenInfo.next + lenInfo.value;
      if (this.recvBuf.length < total) return;
      const body = this.recvBuf.slice(lenInfo.next, total);
      this.recvBuf = this.recvBuf.slice(total);
      const msg = decode(body);

      // Dump raw hex of every parsed pairing message so we can see exactly
      // what the TV is sending.
      const hex = Array.from(body).map(b => b.toString(16).padStart(2, '0')).join(' ');
      const fields = Array.from(msg.keys()).join(',');
      console.log(`[GoogleTV] parsed msg (fields=${fields}): ${hex}`);

      const w = this.msgQueue.shift();
      if (w) w(msg);
      else this.controlHandler?.(msg);
    }
  }

  private nextMessage(): Promise<Map<number, any>> {
    return new Promise(res => this.msgQueue.push(res));
  }
}

// helpers
function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2) hex = '0' + hex;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

function stripPrefix(s: string): string {
  return s.startsWith('0x') || s.startsWith('0X') ? s.slice(2) : s;
}

function uint8ToBinary(arr: Uint8Array): string {
  let s = '';
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return s;
}
