import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Delete, SendHorizontal } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { RemoteKey } from '../types';

const ROWS = [
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l'],
  ['z','x','c','v','b','n','m'],
];

interface Props {
  onKey: (key: RemoteKey, label: string) => void;
  onSendText: (text: string) => void;
}

export function KeyboardScreen({ onKey, onSendText }: Props) {
  const [text, setText] = useState('');
  const [caps, setCaps] = useState(false);

  const handleChar = (ch: string) => {
    const c = caps ? ch.toUpperCase() : ch;
    setText(t => t + c);
  };

  const handleSend = () => {
    if (text) {
      onSendText(text);
      setText('');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type to search or enter text…"
          placeholderTextColor={Colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable onPress={handleSend} style={styles.sendBtn}>
          <SendHorizontal size={18} color={Colors.amber} />
        </Pressable>
      </View>

      <View style={styles.keyboard}>
        {ROWS.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {ri === 2 && (
              <Pressable style={[styles.key, styles.keyWide]} onPress={() => setCaps(c => !c)}>
                <Text style={[styles.keyText, caps && styles.keyTextActive]}>⇧</Text>
              </Pressable>
            )}
            {row.map(ch => (
              <Pressable key={ch} style={styles.key} onPress={() => handleChar(ch)}>
                <Text style={styles.keyText}>{caps ? ch.toUpperCase() : ch}</Text>
              </Pressable>
            ))}
            {ri === 2 && (
              <Pressable style={[styles.key, styles.keyWide]} onPress={() => setText(t => t.slice(0, -1))}>
                <Delete size={14} color={Colors.textIcon} />
              </Pressable>
            )}
          </View>
        ))}

        {/* Bottom row */}
        <View style={styles.row}>
          <Pressable style={[styles.key, styles.keySymbol]} onPress={() => handleChar('123')}>
            <Text style={styles.keyText}>123</Text>
          </Pressable>
          <Pressable style={[styles.key, styles.keySpace]} onPress={() => setText(t => t + ' ')}>
            <Text style={styles.keyText}>SPACE</Text>
          </Pressable>
          <Pressable style={[styles.key, styles.keySymbol]} onPress={handleSend}>
            <Text style={[styles.keyText, { color: Colors.amber }]}>GO</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.hint}>
        Typed text will be sent to the active device input field.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.btnStart,
    borderRadius: 12,
    padding: 12,
    color: Colors.textPrimary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.btnStart,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboard: { gap: 6 },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  key: {
    width: 28,
    height: 36,
    borderRadius: 6,
    backgroundColor: Colors.btnStart,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  keyWide: { width: 40 },
  keySymbol: { width: 44 },
  keySpace: { flex: 1, maxWidth: 140 },
  keyText: {
    color: Colors.textIcon,
    fontSize: 13,
    fontWeight: '500',
  },
  keyTextActive: {
    color: Colors.amber,
  },
  hint: {
    marginTop: 16,
    color: Colors.textSecondary,
    fontSize: 10,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
});
