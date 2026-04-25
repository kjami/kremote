import { ConnectionStatus, RemoteKey } from '../../types';

export interface IDeviceService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendKey(key: RemoteKey): Promise<void>;
  launchApp(appId: string): Promise<void>;
  getStatus(): ConnectionStatus;
}
