import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Device, DeviceType, PRESET_DEVICES } from '../types';
import { IDeviceService } from './devices/IDeviceService';
import { SonyBraviaService, PinPrompt } from './devices/SonyBraviaService';
import { SamsungTizenService } from './devices/SamsungTizenService';
import { AmazonFirestickService } from './devices/AmazonFirestickService';
import { GoogleTvService, PairingPrompt } from './devices/GoogleTvService';

const DEVICES_KEY = 'saved_devices';
const AUTH_KEY_PREFIX = 'device_authkey_';

function authKeyName(deviceId: string): string {
  return AUTH_KEY_PREFIX + deviceId;
}

export class DeviceManager {
  private static instance: DeviceManager;
  private services = new Map<string, IDeviceService>();
  private devices: Device[] = [];
  private pairingPrompt: PairingPrompt = async () => {
    throw new Error('No pairing prompt registered');
  };
  private pinPrompt: PinPrompt = async () => {
    throw new Error('No PIN prompt registered');
  };

  static getInstance(): DeviceManager {
    if (!DeviceManager.instance) {
      DeviceManager.instance = new DeviceManager();
    }
    return DeviceManager.instance;
  }

  setPairingPrompt(p: PairingPrompt): void { this.pairingPrompt = p; }
  setPinPrompt(p: PinPrompt): void { this.pinPrompt = p; }

  createService(device: Device): IDeviceService {
    switch (device.type as DeviceType) {
      case 'googletv':  return new GoogleTvService(device, this.pairingPrompt);
      case 'sony':      return new SonyBraviaService(device, this.pinPrompt);
      case 'samsung':   return new SamsungTizenService(device);
      case 'firestick': return new AmazonFirestickService(device);
    }
  }

  getService(deviceId: string): IDeviceService | undefined {
    return this.services.get(deviceId);
  }

  async connectDevice(device: Device): Promise<void> {
    let svc = this.services.get(device.id);
    if (!svc) {
      svc = this.createService(device);
      this.services.set(device.id, svc);
    }
    await svc.connect();
  }

  async disconnectDevice(deviceId: string): Promise<void> {
    await this.services.get(deviceId)?.disconnect();
  }

  async loadDevices(): Promise<Device[]> {
    try {
      const raw = await AsyncStorage.getItem(DEVICES_KEY);
      const fromDisk: Device[] = raw ? JSON.parse(raw) : PRESET_DEVICES;
      // Rehydrate authKey from SecureStore (it's stripped before persistence).
      this.devices = await Promise.all(fromDisk.map(async (d) => {
        try {
          const k = await SecureStore.getItemAsync(authKeyName(d.id));
          return k ? { ...d, authKey: k } : d;
        } catch {
          return d;
        }
      }));
    } catch {
      this.devices = PRESET_DEVICES;
    }
    return this.devices;
  }

  async saveDevices(devices: Device[]): Promise<void> {
    this.devices = devices;
    // Persist secrets separately, scrub them out of the AsyncStorage record.
    await Promise.all(devices.map(async (d) => {
      if (d.authKey) {
        await SecureStore.setItemAsync(authKeyName(d.id), d.authKey).catch(() => {});
      } else {
        await SecureStore.deleteItemAsync(authKeyName(d.id)).catch(() => {});
      }
    }));
    const stripped = devices.map(({ authKey: _ak, ...rest }) => rest);
    await AsyncStorage.setItem(DEVICES_KEY, JSON.stringify(stripped));
  }

  async addDevice(device: Device): Promise<void> {
    const updated = [...this.devices.filter(d => d.id !== device.id), device];
    await this.saveDevices(updated);
  }

  async removeDevice(deviceId: string): Promise<void> {
    await this.disconnectDevice(deviceId);
    this.services.delete(deviceId);
    await SecureStore.deleteItemAsync(authKeyName(deviceId)).catch(() => {});
    await this.saveDevices(this.devices.filter(d => d.id !== deviceId));
  }

  /**
   * Forget a device — delete *all* persistent state for it: the device record,
   * its authKey, the Sony auth cookie, the Polo client cert (only if no other
   * device shares it — which is the case in our model), and the Polo paired
   * flag for this host.
   */
  async forgetDevice(deviceId: string): Promise<void> {
    const dev = this.devices.find(d => d.id === deviceId);
    if (dev) {
      // Wipe Sony auth cookie + Polo paired flag (both keyed by host)
      const ipKey = dev.ip.replace(/[^a-zA-Z0-9]/g, '_');
      await SecureStore.deleteItemAsync(`sony_auth_cookie_${ipKey}`).catch(() => {});
      await SecureStore.deleteItemAsync(`gtv_paired_v3_${ipKey}`).catch(() => {});
      await SecureStore.deleteItemAsync(`gtv_pinned_cert_${ipKey}`).catch(() => {});
    }
    await this.removeDevice(deviceId);
  }
}
