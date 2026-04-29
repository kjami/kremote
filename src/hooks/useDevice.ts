import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ConnectionStatus, Device, DeviceApp, RemoteKey } from '../types';
import { DeviceManager } from '../services/DeviceManager';
import { loadFavorites, toggleFavorite as toggleFavoriteStored } from '../services/Favorites';

const manager = DeviceManager.getInstance();
const ACTIVE_KEY = 'active_device_id';

export function useDevice() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [activeDevice, setActiveDevice] = useState<Device | null>(null);
  const [connStatus, setConnStatus] = useState<ConnectionStatus>({ isConnected: false, isConnecting: false });
  const [apps, setApps] = useState<DeviceApp[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      const loaded = await manager.loadDevices();
      setDevices(loaded);
      if (loaded.length === 0) return;
      const savedId = await AsyncStorage.getItem(ACTIVE_KEY);
      const chosen = loaded.find(d => d.id === savedId) ?? loaded[0];
      setActiveDevice(chosen);
    })();
  }, []);

  const pollStatus = useCallback((device: Device) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      const svc = manager.getService(device.id);
      if (svc) setConnStatus({ ...svc.getStatus() });
    }, 2000);
  }, []);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const selectDevice = useCallback(async (device: Device) => {
    console.log('[useDevice] selectDevice', device.name, device.type, device.ip);
    if (activeDevice && activeDevice.id !== device.id) {
      await manager.disconnectDevice(activeDevice.id).catch(() => {});
    }
    setActiveDevice(device);
    await AsyncStorage.setItem(ACTIVE_KEY, device.id);
    setConnStatus({ isConnected: false, isConnecting: true });
    try {
      await manager.connectDevice(device);
      const svc = manager.getService(device.id)!;
      setConnStatus(svc.getStatus());
      pollStatus(device);
      console.log('[useDevice] selectDevice connected ok');
    } catch (e) {
      console.warn('[useDevice] selectDevice connect failed:', (e as Error).message);
      setConnStatus({ isConnected: false, isConnecting: false, error: (e as Error).message });
    }
  }, [activeDevice, pollStatus]);

  const sendKey = useCallback(async (key: RemoteKey) => {
    if (!activeDevice) throw new Error('No device selected');
    let svc = manager.getService(activeDevice.id);
    if (!svc || !svc.getStatus().isConnected) {
      console.log('[useDevice] auto-connecting to', activeDevice.name, activeDevice.ip);
      await manager.connectDevice(activeDevice);
      svc = manager.getService(activeDevice.id);
      pollStatus(activeDevice);
    }
    if (!svc) throw new Error('Service not available');
    await svc.sendKey(key);
  }, [activeDevice, pollStatus]);

  const launchApp = useCallback(async (appId: string) => {
    if (!activeDevice) return;
    await manager.getService(activeDevice.id)?.launchApp(appId);
  }, [activeDevice]);

  const addDevice = useCallback(async (device: Device) => {
    await manager.addDevice(device);
    const updated = await manager.loadDevices();
    setDevices(updated);
  }, []);

  const removeDevice = useCallback(async (deviceId: string) => {
    await manager.removeDevice(deviceId);
    const updated = await manager.loadDevices();
    setDevices(updated);
    if (activeDevice?.id === deviceId) setActiveDevice(updated[0] ?? null);
  }, [activeDevice]);

  // Refresh installed apps from the active device
  const refreshApps = useCallback(async () => {
    if (!activeDevice) return;
    setAppsLoading(true);
    try {
      let svc = manager.getService(activeDevice.id);
      if (!svc || !svc.getStatus().isConnected) {
        await manager.connectDevice(activeDevice);
        svc = manager.getService(activeDevice.id);
      }
      const list = await (svc?.listApps() ?? Promise.resolve([]));
      setApps(list);
    } catch (e) {
      console.warn('[useDevice] refreshApps failed:', (e as Error).message);
    } finally {
      setAppsLoading(false);
    }
  }, [activeDevice]);

  // Reload favorites whenever the active device changes
  useEffect(() => {
    if (!activeDevice) { setFavoriteIds(new Set()); return; }
    loadFavorites(activeDevice.id).then(setFavoriteIds);
  }, [activeDevice]);

  const toggleFavorite = useCallback(async (appId: string) => {
    if (!activeDevice) return;
    const updated = await toggleFavoriteStored(activeDevice.id, appId);
    setFavoriteIds(new Set(updated));
  }, [activeDevice]);

  return {
    devices, activeDevice, connStatus,
    selectDevice, sendKey, launchApp, addDevice, removeDevice,
    apps, appsLoading, refreshApps,
    favoriteIds, toggleFavorite,
  };
}
