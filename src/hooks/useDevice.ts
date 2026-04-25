import { useCallback, useEffect, useRef, useState } from 'react';
import { ConnectionStatus, Device, RemoteKey } from '../types';
import { DeviceManager } from '../services/DeviceManager';

const manager = DeviceManager.getInstance();

export function useDevice() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [activeDevice, setActiveDevice] = useState<Device | null>(null);
  const [connStatus, setConnStatus] = useState<ConnectionStatus>({ isConnected: false, isConnecting: false });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    manager.loadDevices().then(loaded => {
      setDevices(loaded);
      if (loaded.length > 0) setActiveDevice(loaded[0]);
    });
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
    // Disconnect previous
    if (activeDevice) {
      await manager.disconnectDevice(activeDevice.id).catch(() => {});
    }
    setActiveDevice(device);
    setConnStatus({ isConnected: false, isConnecting: true });
    try {
      await manager.connectDevice(device);
      const svc = manager.getService(device.id)!;
      setConnStatus(svc.getStatus());
      pollStatus(device);
    } catch (e) {
      setConnStatus({ isConnected: false, isConnecting: false, error: (e as Error).message });
    }
  }, [activeDevice, pollStatus]);

  const sendKey = useCallback(async (key: RemoteKey) => {
    if (!activeDevice) return;
    const svc = manager.getService(activeDevice.id);
    if (!svc) {
      // Auto-connect on first key press
      await manager.connectDevice(activeDevice);
      pollStatus(activeDevice);
    }
    await manager.getService(activeDevice.id)?.sendKey(key);
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

  return { devices, activeDevice, connStatus, selectDevice, sendKey, launchApp, addDevice, removeDevice };
}
