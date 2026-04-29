import 'react-native-get-random-values';
import { Buffer } from 'buffer';
// React Native doesn't expose Buffer globally — many libs (react-native-tcp-socket)
// expect it on the global object.
(globalThis as any).Buffer = Buffer;
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, View,
} from 'react-native';
import { RemoteKey } from './src/types';
import { Colors } from './src/constants/colors';
import { useDevice } from './src/hooks/useDevice';
import { DeviceManager } from './src/services/DeviceManager';
import { DeviceSelector } from './src/components/DeviceSelector';
import { Toast } from './src/components/Toast';
import { TabBar, TabId } from './src/components/TabBar';
import { PairingModal, PairingRequest } from './src/components/PairingModal';
import { PinModal, PinRequest } from './src/components/PinModal';
import { RemoteScreen } from './src/screens/RemoteScreen';
import { AppsScreen } from './src/screens/AppsScreen';
import { KeyboardScreen } from './src/screens/KeyboardScreen';
import { OTTScreen } from './src/screens/OTTScreen';

export default function App() {
  const {
    devices, activeDevice, connStatus,
    selectDevice, sendKey, launchApp, addDevice, removeDevice,
    apps, appsLoading, refreshApps,
    favoriteIds, toggleFavorite,
  } = useDevice();

  // Favorite apps = installed apps that are starred
  const favoriteApps = apps.filter(a => favoriteIds.has(a.id));

  const [pressed, setPressed]   = useState<string | null>(null);
  const [toast, setToast]       = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('remote');
  const [pairingReq, setPairingReq] = useState<PairingRequest | null>(null);
  const [pinReq, setPinReq] = useState<PinRequest | null>(null);

  // Register the pairing + PIN prompts with the DeviceManager.
  useEffect(() => {
    const mgr = DeviceManager.getInstance();
    mgr.setPairingPrompt(() => new Promise<string>((resolve, reject) => {
      setPairingReq({
        deviceName: activeDevice?.name ?? 'Google TV',
        resolve: (code) => { setPairingReq(null); resolve(code); },
        reject:  (err)  => { setPairingReq(null); reject(err);  },
      });
    }));
    mgr.setPinPrompt(() => new Promise<string>((resolve, reject) => {
      setPinReq({
        deviceName: activeDevice?.name ?? 'Sony TV',
        resolve: (pin) => { setPinReq(null); resolve(pin); },
        reject:  (err) => { setPinReq(null); reject(err);  },
      });
    }));
  }, [activeDevice]);

  const toastTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tap = useCallback((id: string, label: string) => {
    setPressed(id);
    setToast(label);
    if (pressTimer.current) clearTimeout(pressTimer.current);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    pressTimer.current = setTimeout(() => setPressed(null), 180);
    toastTimer.current = setTimeout(() => setToast(null), 1400);
  }, []);

  const handleKey = useCallback((key: RemoteKey, label: string) => {
    tap(key, label);
    sendKey(key).catch((e: Error) => {
      console.warn('[sendKey]', key, e.message);
      tap(key, `⚠ ${e.message.slice(0, 60)}`);
    });
  }, [tap, sendKey]);

  const handleLaunch = useCallback((id: string, label?: string) => {
    tap(id, `Launching ${label ?? id}`);
    launchApp(id).catch((e: Error) => {
      console.warn('[launchApp]', id, e.message);
      tap(id, `⚠ ${e.message.slice(0, 60)}`);
    });
  }, [tap, launchApp]);

  const handleSendText = useCallback((text: string) => {
    // For each character, send as shell input
    // This is Firestick-specific; Sony/Samsung use their own text-input APIs
    tap('text', `Sending: ${text}`);
  }, [tap]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bgEnd} />
      <View style={styles.bg}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.cardWrapper}>
            {/* Toast notification */}
            <Toast message={toast} />

            {/* Remote body card */}
            <View style={styles.card}>
              {/* Device selector + connection status */}
              <DeviceSelector
                devices={devices}
                active={activeDevice}
                isConnected={connStatus.isConnected}
                onSelect={selectDevice}
                onAdd={addDevice}
                onRemove={removeDevice}
              />

              {/* Tab content */}
              {activeTab === 'remote' && (
                <RemoteScreen
                  onKey={handleKey}
                  onLaunchApp={(id) => handleLaunch(id)}
                  pressed={pressed}
                  favoriteApps={favoriteApps}
                />
              )}
              {activeTab === 'apps' && (
                <AppsScreen
                  apps={apps}
                  loading={appsLoading}
                  favoriteIds={favoriteIds}
                  onLaunch={(id) => handleLaunch(id)}
                  onToggleFavorite={toggleFavorite}
                  onRefresh={refreshApps}
                  deviceName={activeDevice?.name ?? null}
                />
              )}
              {activeTab === 'keyboard' && (
                <KeyboardScreen onKey={handleKey} onSendText={handleSendText} />
              )}
              {activeTab === 'ott' && (
                <OTTScreen onLaunch={(id) => handleLaunch(id)} />
              )}

              {/* Bottom tab bar */}
              <TabBar active={activeTab} onChange={setActiveTab} />
            </View>

            {/* Pairing prompt for Google TV */}
            <PairingModal request={pairingReq} />
            {/* PIN prompt for Sony BRAVIA */}
            <PinModal request={pinReq} />

            {/* Subtle amber reflection below card */}
            <View style={styles.reflection} />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bgEnd,
  },
  bg: {
    flex: 1,
    backgroundColor: Colors.bgMid,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'android' ? 24 : 16,
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 380,
    position: 'relative',
  },
  card: {
    borderRadius: 44,
    padding: 24,
    backgroundColor: Colors.remoteStart,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 40 },
    shadowOpacity: 0.8,
    shadowRadius: 40,
    elevation: 20,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  reflection: {
    position: 'absolute',
    bottom: -16,
    left: 32,
    right: 32,
    height: 32,
    borderRadius: 100,
    backgroundColor: Colors.amber,
    opacity: 0.15,
    // blur not supported in RN — use shadow instead on iOS
    shadowColor: Colors.amber,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
});
