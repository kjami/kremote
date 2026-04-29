import React, { useState } from 'react';
import {
  Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Settings, Wifi, WifiOff, X } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { Device, DeviceType } from '../types';

interface Props {
  devices: Device[];
  active: Device | null;
  isConnected: boolean;
  onSelect: (device: Device) => void;
  onAdd: (device: Device) => void;
  onRemove: (id: string) => void;
}

export function DeviceSelector({ devices, active, isConnected, onSelect, onAdd, onRemove }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [form, setForm] = useState({ name: '', ip: '', type: 'googletv' as DeviceType, authKey: '' });

  const handleAdd = () => {
    if (!form.name || !form.ip) return;
    onAdd({
      id: `${form.type}-${Date.now()}`,
      name: form.name,
      ip: form.ip,
      type: form.type,
      authKey: form.authKey,
    });
    setAddMode(false);
    setForm({ name: '', ip: '', type: 'googletv', authKey: '' });
  };

  return (
    <>
      <View style={styles.row}>
        <View style={styles.statusRow}>
          <View style={[styles.dot, isConnected ? styles.dotOn : styles.dotOff]} />
          <Text style={[styles.statusText, isConnected ? styles.statusOn : styles.statusOff]}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
        <Pressable style={styles.settingsBtn} onPress={() => setModalVisible(true)}>
          <Settings size={14} color={Colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.deviceRow}>
        <Text style={styles.subLabel}>Now Controlling</Text>
        <Pressable onPress={() => setModalVisible(true)}>
          <Text style={styles.deviceName}>{active?.name ?? 'No device'}</Text>
        </Pressable>
      </View>

      <Modal transparent visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Devices</Text>
              <Pressable onPress={() => { setModalVisible(false); setAddMode(false); }}>
                <X size={20} color={Colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView style={styles.deviceList}>
              {devices.map(d => (
                <Pressable key={d.id} style={styles.deviceItem} onPress={() => { onSelect(d); setModalVisible(false); }}>
                  <View style={styles.deviceItemLeft}>
                    {d.id === active?.id && isConnected
                      ? <Wifi size={16} color={Colors.connected} />
                      : <WifiOff size={16} color={Colors.textSecondary} />}
                    <View>
                      <Text style={styles.deviceItemName}>{d.name}</Text>
                      <Text style={styles.deviceItemSub}>{d.type.toUpperCase()} · {d.ip}</Text>
                    </View>
                  </View>
                  <Pressable onPress={() => onRemove(d.id)}>
                    <X size={14} color={Colors.textSecondary} />
                  </Pressable>
                </Pressable>
              ))}
            </ScrollView>

            {addMode ? (
              <View style={styles.addForm}>
                <TextInput
                  style={styles.input}
                  placeholder="Device name"
                  placeholderTextColor={Colors.textSecondary}
                  value={form.name}
                  onChangeText={t => setForm(f => ({ ...f, name: t }))}
                />
                <TextInput
                  style={styles.input}
                  placeholder="IP address (e.g. 192.168.1.100)"
                  placeholderTextColor={Colors.textSecondary}
                  value={form.ip}
                  onChangeText={t => setForm(f => ({ ...f, ip: t }))}
                  keyboardType="decimal-pad"
                />
                <View style={styles.typeRow}>
                  {(['googletv', 'sony', 'samsung', 'firestick'] as DeviceType[]).map(t => (
                    <Pressable key={t} style={[styles.typeBtn, form.type === t && styles.typeBtnActive]}
                               onPress={() => setForm(f => ({ ...f, type: t }))}>
                      <Text style={[styles.typeBtnText, form.type === t && styles.typeBtnTextActive]}>
                        {t === 'firestick' ? 'Fire TV'
                          : t === 'googletv'  ? 'Google TV'
                          : t.charAt(0).toUpperCase() + t.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {form.type === 'sony' && (
                  <TextInput
                    style={styles.input}
                    placeholder="Pre-shared key (PSK) — optional"
                    placeholderTextColor={Colors.textSecondary}
                    value={form.authKey}
                    onChangeText={t => setForm(f => ({ ...f, authKey: t }))}
                  />
                )}
                <View style={styles.addBtns}>
                  <Pressable style={styles.cancelBtn} onPress={() => setAddMode(false)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={styles.saveBtn} onPress={handleAdd}>
                    <Text style={styles.saveBtnText}>Add Device</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable style={styles.addDeviceBtn} onPress={() => setAddMode(true)}>
                <Text style={styles.addDeviceBtnText}>+ Add Device</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOn: { backgroundColor: Colors.connected, shadowColor: Colors.connected, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 4 },
  dotOff: { backgroundColor: Colors.textSecondary },
  statusText: { fontFamily: 'monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2 },
  statusOn: { color: Colors.connected },
  statusOff: { color: Colors.textSecondary },
  settingsBtn: { padding: 8, borderRadius: 20, backgroundColor: Colors.surface },
  deviceRow: { marginBottom: 24 },
  subLabel: { color: Colors.textSecondary, fontFamily: 'monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2.5, marginBottom: 4 },
  deviceName: { color: Colors.textPrimary, fontSize: 20, fontWeight: '600' },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.remoteMid, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '600' },
  deviceList: { maxHeight: 300 },
  deviceItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  deviceItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deviceItemName: { color: Colors.textPrimary, fontSize: 15 },
  deviceItemSub: { color: Colors.textSecondary, fontSize: 11, marginTop: 2 },

  addDeviceBtn: { marginTop: 16, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: Colors.amber, alignItems: 'center' },
  addDeviceBtnText: { color: Colors.amber, fontSize: 14, fontWeight: '600' },

  addForm: { marginTop: 16, gap: 10 },
  input: { backgroundColor: Colors.btnStart, borderRadius: 10, padding: 12, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, fontSize: 14 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  typeBtnActive: { borderColor: Colors.amber, backgroundColor: 'rgba(255,153,51,0.1)' },
  typeBtnText: { color: Colors.textSecondary, fontSize: 12 },
  typeBtnTextActive: { color: Colors.amber },
  addBtns: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelBtnText: { color: Colors.textSecondary, fontSize: 14 },
  saveBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: Colors.amber, alignItems: 'center' },
  saveBtnText: { color: '#1a0f00', fontSize: 14, fontWeight: '700' },
});
