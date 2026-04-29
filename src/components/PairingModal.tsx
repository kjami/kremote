import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Tv } from 'lucide-react-native';
import { Colors } from '../constants/colors';

export interface PairingRequest {
  deviceName: string;
  resolve: (code: string) => void;
  reject: (err: Error) => void;
}

interface Props {
  request: PairingRequest | null;
}

export function PairingModal({ request }: Props) {
  const [code, setCode] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (request) {
      setCode('');
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [request]);

  const submit = () => {
    if (!request || !code.trim()) return;
    request.resolve(code.trim());
  };

  const cancel = () => {
    request?.reject(new Error('Pairing cancelled'));
  };

  return (
    <Modal
      transparent
      visible={!!request}
      animationType="fade"
      onRequestClose={cancel}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.iconWrap}>
            <Tv size={36} color={Colors.amber} />
          </View>
          <Text style={styles.title}>Pair with {request?.deviceName ?? 'TV'}</Text>
          <Text style={styles.subtitle}>
            A code is shown on your TV screen.{'\n'}Enter it below to authorize this remote.
          </Text>

          <TextInput
            ref={inputRef}
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder="ABCD12"
            placeholderTextColor={Colors.textSecondary}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={12}
            onSubmitEditing={submit}
          />

          <View style={styles.btnRow}>
            <Pressable style={styles.cancelBtn} onPress={cancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.pairBtn} onPress={submit}>
              <Text style={styles.pairText}>Pair</Text>
            </Pressable>
          </View>

          <Text style={styles.hint}>
            One-time setup. Your phone will trust this TV after pairing.
          </Text>
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
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,153,51,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  input: {
    width: '100%',
    backgroundColor: Colors.btnStart,
    borderRadius: 12,
    padding: 14,
    color: Colors.textPrimary,
    fontSize: 22,
    textAlign: 'center',
    fontFamily: 'monospace',
    letterSpacing: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 16,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
  },
  cancelText: { color: Colors.textSecondary, fontSize: 14 },
  pairBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.amber,
    alignItems: 'center',
  },
  pairText: { color: '#1a0f00', fontSize: 14, fontWeight: '700' },
  hint: {
    marginTop: 14,
    color: Colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
  },
});
