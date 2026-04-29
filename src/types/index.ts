export type DeviceType = 'googletv' | 'sony' | 'samsung' | 'firestick';

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

export interface DeviceApp {
  id: string;          // stable per-device identifier (URI for Sony, package for ADB)
  name: string;        // human-readable label
  iconUrl?: string;    // optional remote icon URL
  uri?: string;        // launch URI / activity / package
}

export interface AppShortcut {
  id: string;
  name: string;
  packageName: string;
  bg: string;
}

// Empty by default — user adds their own device with a real IP.
export const PRESET_DEVICES: Device[] = [];
