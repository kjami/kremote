import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Lock } from 'lucide-react-native';
import { Colors } from '../constants/colors';

export interface PinRequest {
  deviceName: string;
  resolve: (pin: string) => void;
  reject: (err: Error) => void;
}

interface Props {
  request: PinRequest | null;
}

export function PinModal({ request }: Props) {
  const [pin, setPin] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (request) {
      setPin('');
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [request]);

  const submit = () => {
    if (!request) return;
    if (!/^\d{4}$/.test(pin)) return;
    request.resolve(pin);
  };

  const cancel = () => request?.reject(new Error('PIN entry cancelled'));

  return (
    <Modal transparent visible={!!request} animationType="fade" onRequestClose={cancel}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.iconWrap}>
            <Lock size={32} color={Colors.amber} />
          </View>
          <Text style={styles.title}>Pair with {request?.deviceName ?? 'Sony TV'}</Text>
          <Text style={styles.subtitle}>
            Your TV is showing a 4-digit PIN.{'\n'}Enter it below to authorize this remote.
          </Text>

          <TextInput
            ref={inputRef}
            style={styles.input}
            value={pin}
            onChangeText={(t) => setPin(t.replace(/\D/g, '').slice(0, 4))}
            placeholder="0000"
            placeholderTextColor={Colors.textSecondary}
            keyboardType="number-pad"
            maxLength={4}
            onSubmitEditing={submit}
          />

          <View style={styles.btnRow}>
            <Pressable style={styles.cancelBtn} onPress={cancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.pairBtn, pin.length !== 4 && styles.pairBtnDisabled]}
                       onPress={submit} disabled={pin.length !== 4}>
              <Text style={styles.pairText}>Pair</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.remoteMid,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,153,51,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { color: Colors.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 8 },
  subtitle: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  input: {
    width: '100%',
    backgroundColor: Colors.btnStart,
    borderRadius: 12,
    padding: 16,
    color: Colors.textPrimary,
    fontSize: 28,
    textAlign: 'center',
    fontFamily: 'monospace',
    letterSpacing: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 16,
  },
  btnRow: { flexDirection: 'row', gap: 10, width: '100%' },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderLight, alignItems: 'center' },
  cancelText: { color: Colors.textSecondary, fontSize: 14 },
  pairBtn: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: Colors.amber, alignItems: 'center' },
  pairBtnDisabled: { opacity: 0.4 },
  pairText: { color: '#1a0f00', fontSize: 14, fontWeight: '700' },
});
