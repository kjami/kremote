import { ConnectionStatus, DeviceApp, RemoteKey } from '../../types';

export interface IDeviceService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendKey(key: RemoteKey): Promise<void>;
  launchApp(appId: string): Promise<void>;
  /** Return apps installed on the device. May return [] if unsupported. */
  listApps(): Promise<DeviceApp[]>;
  getStatus(): ConnectionStatus;
}
