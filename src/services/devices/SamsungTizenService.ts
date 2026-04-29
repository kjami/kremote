import { ConnectionStatus, Device, DeviceApp, RemoteKey } from '../../types';
import { SAMSUNG_APPS, SAMSUNG_KEYS } from '../../constants/commands';
import { IDeviceService } from './IDeviceService';

function b64(s: string): string {
  return Buffer.from(s).toString('base64');
}

export class SamsungTizenService implements IDeviceService {
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = { isConnected: false, isConnecting: false };
  private token: string = '';
  private appName = b64('TV Remote');

  constructor(private device: Device) {}

  private get wsUrl(): string {
    const port = this.device.port ?? 8001;
    const tokenParam = this.token ? `&token=${this.token}` : '';
    return `ws://${this.device.ip}:${port}/api/v2/channels/samsung.remote.control?name=${this.appName}${tokenParam}`;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.status = { isConnected: false, isConnecting: true };
      const ws = new WebSocket(this.wsUrl);
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Connection timeout'));
      }, 8000);

      ws.onopen = () => {
        this.ws = ws;
        this.status = { isConnected: true, isConnecting: false };
        clearTimeout(timeout);
        resolve();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string);
          if (msg?.data?.token) {
            this.token = msg.data.token;
          }
        } catch { /* ignore parse errors */ }
      };

      ws.onerror = () => {
        this.status = { isConnected: false, isConnecting: false, error: 'WebSocket error' };
        clearTimeout(timeout);
        reject(new Error('WebSocket error'));
      };

      ws.onclose = () => {
        this.ws = null;
        this.status = { isConnected: false, isConnecting: false };
      };
    });
  }

  async disconnect(): Promise<void> {
    this.ws?.close();
    this.ws = null;
    this.status = { isConnected: false, isConnecting: false };
  }

  async sendKey(key: RemoteKey): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const samsungKey = SAMSUNG_KEYS[key];
    if (!samsungKey) return;
    this.ws.send(JSON.stringify({
      method: 'ms.remote.control',
      params: {
        Cmd: 'Click',
        DataOfCmd: samsungKey,
        Option: 'false',
        TypeOfRemote: 'SendRemoteKey',
      },
    }));
  }

  async launchApp(appId: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const tizenAppId = SAMSUNG_APPS[appId];
    if (!tizenAppId) return;
    this.ws.send(JSON.stringify({
      method: 'ms.channel.emit',
      params: {
        event: 'ed.apps.launch',
        to: 'host',
        data: { appId: tizenAppId },
      },
    }));
  }

  async listApps(): Promise<DeviceApp[]> {
    // Samsung exposes installed apps via REST at http://TV:8001/api/v2/applications/installed_app
    // but it requires the same token used for WebSocket auth, which we don't
    // currently expose here. Return [] for now — favorites will fall back to
    // the static SAMSUNG_APPS table picked from the UI manually.
    return [];
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }
}
