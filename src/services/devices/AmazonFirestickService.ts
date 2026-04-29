import { ConnectionStatus, Device, DeviceApp, RemoteKey } from '../../types';
import { FIRESTICK_APPS, FIRESTICK_KEYCODES } from '../../constants/commands';
import { IDeviceService } from './IDeviceService';
import { AdbClient } from '../adb/AdbClient';

export class AmazonFirestickService implements IDeviceService {
  private client: AdbClient;
  private status: ConnectionStatus = { isConnected: false, isConnecting: false };

  constructor(private device: Device) {
    this.client = new AdbClient();
  }

  async connect(): Promise<void> {
    this.status = { isConnected: false, isConnecting: true };
    try {
      await this.client.connect(this.device.ip, this.device.port ?? 5555);
      this.status = { isConnected: true, isConnecting: false };
    } catch (e) {
      this.status = { isConnected: false, isConnecting: false, error: (e as Error).message };
      throw e;
    }
  }

  async disconnect(): Promise<void> {
    this.client.disconnect();
    this.status = { isConnected: false, isConnecting: false };
  }

  async sendKey(key: RemoteKey): Promise<void> {
    if (!this.client.isConnected()) return;
    const keyCode = FIRESTICK_KEYCODES[key];
    if (keyCode === undefined) return;
    await this.client.shell(`input keyevent ${keyCode}`);
  }

  async launchApp(appId: string): Promise<void> {
    if (!this.client.isConnected()) return;
    const activity = FIRESTICK_APPS[appId];
    if (!activity) return;
    await this.client.shell(`am start -n ${activity}`);
  }

  async listApps(): Promise<DeviceApp[]> {
    // ADB shell `pm list packages -3` returns user-installed packages only.
    // Output: package:com.netflix.ninja\npackage:com.amazon.tv...\n
    // We don't have a clean "shell with output capture" helper in our minimal
    // ADB client yet, so for now we return the curated FIRESTICK_APPS table.
    // TODO: implement shell-with-output to scrape pm list.
    return [];
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }
}
