import AsyncStorage from '@react-native-async-storage/async-storage';
import { Device, DeviceType, PRESET_DEVICES } from '../types';
import { IDeviceService } from './devices/IDeviceService';
import { SonyBraviaService } from './devices/SonyBraviaService';
import { SamsungTizenService } from './devices/SamsungTizenService';
import { AmazonFirestickService } from './devices/AmazonFirestickService';

const DEVICES_KEY = 'saved_devices';

export class DeviceManager {
  private static instance: DeviceManager;
  private services = new Map<string, IDeviceService>();
  private devices: Device[] = [];

  static getInstance(): DeviceManager {
    if (!DeviceManager.instance) {
      DeviceManager.instance = new DeviceManager();
    }
    return DeviceManager.instance;
  }

  createService(device: Device): IDeviceService {
    switch (device.type as DeviceType) {
      case 'sony':      return new SonyBraviaService(device);
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
      this.devices = raw ? JSON.parse(raw) : PRESET_DEVICES;
    } catch {
      this.devices = PRESET_DEVICES;
    }
    return this.devices;
  }

  async saveDevices(devices: Device[]): Promise<void> {
    this.devices = devices;
    await AsyncStorage.setItem(DEVICES_KEY, JSON.stringify(devices));
  }

  async addDevice(device: Device): Promise<void> {
    const updated = [...this.devices.filter(d => d.id !== device.id), device];
    await this.saveDevices(updated);
  }

  async removeDevice(deviceId: string): Promise<void> {
    await this.disconnectDevice(deviceId);
    this.services.delete(deviceId);
    await this.saveDevices(this.devices.filter(d => d.id !== deviceId));
  }
}
