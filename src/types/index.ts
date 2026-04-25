export type DeviceType = 'sony' | 'samsung' | 'firestick';

export type RemoteKey =
  | 'power' | 'up' | 'down' | 'left' | 'right' | 'ok'
  | 'home' | 'back' | 'volup' | 'voldown' | 'mute'
  | 'chup' | 'chdown' | 'play' | 'pause' | 'rewind' | 'forward'
  | 'mic' | 'settings' | 'menu';

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  ip: string;
  port?: number;
  authKey?: string;
}

export interface ConnectionStatus {
  isConnected: boolean;
  isConnecting: boolean;
  error?: string;
}

export interface AppShortcut {
  id: string;
  name: string;
  packageName: string;
  bg: string;
}

export const PRESET_DEVICES: Device[] = [
  {
    id: 'sony-xr55x90j',
    name: 'Sony Google TV',
    type: 'sony',
    ip: '192.168.1.100',
    port: 80,
    authKey: '',
  },
  {
    id: 'samsung-u8200f',
    name: 'Samsung Tizen TV',
    type: 'samsung',
    ip: '192.168.1.101',
    port: 8001,
  },
  {
    id: 'firestick-2nd-gen',
    name: 'Amazon Firestick',
    type: 'firestick',
    ip: '192.168.1.102',
    port: 5555,
  },
];
