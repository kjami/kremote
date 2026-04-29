import { ConnectionStatus, Device, DeviceApp, RemoteKey } from '../../types';
import { FIRESTICK_KEYCODES } from '../../constants/commands';
import { IDeviceService } from './IDeviceService';
import { GoogleTvClient } from '../googletv/GoogleTvClient';

// Google Play / Android TV intent URIs for our preset apps
const APP_LINKS: Record<string, string> = {
  netflix:  'https://www.netflix.com/title/',
  prime:    'https://app.primevideo.com/',
  youtube:  'https://www.youtube.com/tv',
  hotstar:  'https://www.hotstar.com/',
  aha:      'https://www.aha.video/',
  kodi:     'kodi://',
};

export type PairingPrompt = () => Promise<string>;

export class GoogleTvService implements IDeviceService {
  private client: GoogleTvClient;
  private status: ConnectionStatus = { isConnected: false, isConnecting: false };

  constructor(private device: Device, requestPairingCode: PairingPrompt) {
    this.client = new GoogleTvClient(device.ip, {
      onPairingCodeRequired: requestPairingCode,
      onConnected:    () => { this.status = { isConnected: true,  isConnecting: false }; },
      onDisconnected: () => { this.status = { isConnected: false, isConnecting: false }; },
      onError:        (m) => { this.status = { isConnected: false, isConnecting: false, error: m }; },
    });
  }

  private connectInFlight: Promise<void> | null = null;

  async connect(): Promise<void> {
    // Coalesce parallel connect attempts so button-mashing doesn't pile up
    // ten 60s pairing flows.
    if (this.connectInFlight) return this.connectInFlight;
    this.status = { isConnected: false, isConnecting: true };
    this.connectInFlight = (async () => {
      try {
        await this.client.connect();
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

  async disconnect(): Promise<void> {
    this.client.disconnect();
    this.status = { isConnected: false, isConnecting: false };
  }

  async sendKey(key: RemoteKey): Promise<void> {
    if (!this.client.isConnected()) throw new Error('Google TV not connected');
    const code = FIRESTICK_KEYCODES[key]; // standard Android keycodes — same table
    if (code === undefined) return;
    await this.client.sendKey(code);
  }

  async launchApp(appId: string): Promise<void> {
    const link = APP_LINKS[appId];
    if (!link) return;
    await this.client.launchAppLink(link);
  }

  async listApps(): Promise<DeviceApp[]> {
    // Polo protocol doesn't expose an app list endpoint.
    return [];
  }

  getStatus(): ConnectionStatus { return this.status; }
}
