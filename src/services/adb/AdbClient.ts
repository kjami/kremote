import TcpSocket from 'react-native-tcp-socket';
import { RSA } from 'react-native-rsa-native';
import * as SecureStore from 'expo-secure-store';
import {
  CMD, AUTH_TYPE,
  cnxnPacket, openPacket, writePacket, okayPacket, closePacket,
  decodeHeader, encodeMessage,
} from './AdbProtocol';

const KEY_STORE_KEY = 'adb_private_key';
const PUB_STORE_KEY = 'adb_public_key';
const HOST_IDENTITY = 'tv-remote@android';

type AdbState = 'disconnected' | 'connecting' | 'authenticating' | 'connected';

export class AdbClient {
  private socket: ReturnType<typeof TcpSocket.createConnection> | null = null;
  private state: AdbState = 'disconnected';
  private recvBuf: Uint8Array = new Uint8Array(0);
  private pendingConnectResolve?: () => void;
  private pendingConnectReject?: (e: Error) => void;
  private privateKey: string = '';
  private publicKey: string = '';

  // localId -> handler for incoming data on that channel
  private channels = new Map<number, (data: Uint8Array) => void>();
  private nextLocalId = 1;
  private remoteIds = new Map<number, number>(); // localId -> remoteId

  async connect(host: string, port: number): Promise<void> {
    await this.loadOrGenerateKeys();
    return new Promise((resolve, reject) => {
      this.pendingConnectResolve = resolve;
      this.pendingConnectReject = reject;
      this.state = 'connecting';

      this.socket = TcpSocket.createConnection({ host, port, tls: false }, () => {
        this.socket!.write(cnxnPacket() as unknown as string);
      });

      this.socket.on('data', (raw: Buffer | string) => {
        const chunk = typeof raw === 'string'
          ? new TextEncoder().encode(raw)
          : new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
        this.onData(chunk);
      });

      this.socket.on('error', (err: Error) => {
        this.state = 'disconnected';
        reject(err);
        this.pendingConnectReject = undefined;
      });

      this.socket.on('close', () => {
        this.state = 'disconnected';
      });

      setTimeout(() => {
        if (this.state !== 'connected') {
          this.socket?.destroy();
          reject(new Error('ADB connection timeout'));
        }
      }, 10_000);
    });
  }

  disconnect(): void {
    this.socket?.destroy();
    this.socket = null;
    this.state = 'disconnected';
    this.recvBuf = new Uint8Array(0);
    this.channels.clear();
    this.remoteIds.clear();
  }

  isConnected(): boolean {
    return this.state === 'connected';
  }

  async shell(command: string): Promise<void> {
    const localId = this.nextLocalId++;
    await this.openChannel(localId, `shell:${command}`);
  }

  private async openChannel(localId: number, service: string): Promise<void> {
    return new Promise((resolve) => {
      this.channels.set(localId, () => {});
      this.socketWrite(openPacket(localId, service));
      // resolve after OKAY received — handled in onMessage via remoteIds
      const check = setInterval(() => {
        if (this.remoteIds.has(localId)) {
          clearInterval(check);
          resolve();
        }
      }, 50);
      setTimeout(() => { clearInterval(check); resolve(); }, 3000);
    });
  }

  private onData(chunk: Uint8Array): void {
    // Append to buffer
    const merged = new Uint8Array(this.recvBuf.length + chunk.length);
    merged.set(this.recvBuf, 0);
    merged.set(chunk, this.recvBuf.length);
    this.recvBuf = merged;

    while (this.recvBuf.length >= 24) {
      const header = decodeHeader(this.recvBuf.slice(0, 24));
      if (this.recvBuf.length < 24 + header.dataLen) break;

      const data = this.recvBuf.slice(24, 24 + header.dataLen);
      this.recvBuf = this.recvBuf.slice(24 + header.dataLen);
      this.onMessage({ command: header.command, arg0: header.arg0, arg1: header.arg1, data });
    }
  }

  private onMessage(msg: { command: number; arg0: number; arg1: number; data: Uint8Array }): void {
    switch (msg.command) {
      case CMD.CNXN:
        this.state = 'authenticating';
        break;

      case CMD.AUTH:
        this.handleAuth(msg.arg0, msg.data);
        break;

      case CMD.OKAY:
        // arg0=remoteId, arg1=localId — store mapping
        this.remoteIds.set(msg.arg1, msg.arg0);
        if (this.state !== 'connected') {
          this.state = 'connected';
          this.pendingConnectResolve?.();
          this.pendingConnectResolve = undefined;
        }
        break;

      case CMD.WRTE: {
        const handler = this.channels.get(msg.arg1);
        if (handler) handler(msg.data);
        // Send OKAY back to acknowledge
        const remoteId = this.remoteIds.get(msg.arg1);
        if (remoteId !== undefined) {
          this.socketWrite(okayPacket(msg.arg1, remoteId));
        }
        break;
      }

      case CMD.CLSE:
        this.channels.delete(msg.arg1);
        this.remoteIds.delete(msg.arg1);
        break;
    }
  }

  private async handleAuth(authType: number, token: Uint8Array): Promise<void> {
    if (authType === AUTH_TYPE.TOKEN) {
      try {
        // Sign the token with our private key (SHA1withRSA)
        const tokenBase64 = Buffer.from(token).toString('base64');
        const sig = await RSA.signWithAlgorithm(tokenBase64, this.privateKey, 'SHA1withRSA');
        const sigBytes = Buffer.from(sig, 'base64');
        this.socketWrite(encodeMessage({
          command: CMD.AUTH,
          arg0: AUTH_TYPE.SIGNATURE,
          arg1: 0,
          data: new Uint8Array(sigBytes.buffer, sigBytes.byteOffset, sigBytes.byteLength),
        }));
      } catch {
        // Signature failed — send public key so user can accept on TV
        this.sendPublicKey();
      }
    } else if (authType === AUTH_TYPE.SIGNATURE) {
      // Signature rejected — send public key
      this.sendPublicKey();
    }
  }

  private sendPublicKey(): void {
    const keyStr = `${this.publicKey} ${HOST_IDENTITY}\0`;
    const data = new TextEncoder().encode(keyStr);
    this.socketWrite(encodeMessage({
      command: CMD.AUTH,
      arg0: AUTH_TYPE.RSAPUBLICKEY,
      arg1: 0,
      data,
    }));
    // User must accept the ADB authorization prompt on the Firestick screen
  }

  private socketWrite(data: Uint8Array): void {
    if (!this.socket) return;
    this.socket.write(Buffer.from(data) as unknown as string);
  }

  private async loadOrGenerateKeys(): Promise<void> {
    try {
      const stored = await SecureStore.getItemAsync(KEY_STORE_KEY);
      const storedPub = await SecureStore.getItemAsync(PUB_STORE_KEY);
      if (stored && storedPub) {
        this.privateKey = stored;
        this.publicKey = storedPub;
        return;
      }
    } catch { /* generate fresh */ }

    const keys = await RSA.generateKeys(2048);
    this.privateKey = keys.private;
    this.publicKey = keys.public;
    await SecureStore.setItemAsync(KEY_STORE_KEY, keys.private);
    await SecureStore.setItemAsync(PUB_STORE_KEY, keys.public);
  }
}
