import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { RemoteKey } from '../types';

interface Props {
  onPress: (key: RemoteKey, label: string) => void;
  pressed: string | null;
}

export function DPad({ onPress, pressed }: Props) {
  const dirBtn = (key: RemoteKey, label: string, style: object, icon: React.ReactNode) => (
    <Pressable
      key={key}
      onPress={() => onPress(key, label)}
      style={({ pressed: p }) => [styles.dirBtn, style, (p || pressed === key) && styles.dirBtnPressed]}
    >
      {icon}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.disc} />
      {dirBtn('up',    '▲', styles.up,    <ChevronUp    size={22} color={Colors.textIcon} strokeWidth={2.5} />)}
      {dirBtn('down',  '▼', styles.down,  <ChevronDown  size={22} color={Colors.textIcon} strokeWidth={2.5} />)}
      {dirBtn('left',  '◀', styles.left,  <ChevronLeft  size={22} color={Colors.textIcon} strokeWidth={2.5} />)}
      {dirBtn('right', '▶', styles.right, <ChevronRight size={22} color={Colors.textIcon} strokeWidth={2.5} />)}

      <Pressable
        onPress={() => onPress('ok', 'OK')}
        style={({ pressed: p }) => [styles.okBtn, (p || pressed === 'ok') && styles.okBtnPressed]}
      >
        <Text style={styles.okText}>OK</Text>
      </Pressable>
    </View>
  );
}

const SIZE = 200;
const DIR_BTN = 56;

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    alignSelf: 'center',
    marginBottom: 28,
  },
  disc: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: SIZE / 2,
    backgroundColor: Colors.dpadBg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  dirBtn: {
    position: 'absolute',
    width: DIR_BTN,
    height: DIR_BTN,
    borderRadius: DIR_BTN / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  dirBtnPressed: {
    opacity: 0.6,
  },
  up: {
    top: 4,
    left: (SIZE - DIR_BTN) / 2,
    paddingTop: 8,
  },
  down: {
    bottom: 4,
    left: (SIZE - DIR_BTN) / 2,
    paddingBottom: 8,
  },
  left: {
    left: 4,
    top: (SIZE - DIR_BTN) / 2,
    paddingLeft: 8,
  },
  right: {
    right: 4,
    top: (SIZE - DIR_BTN) / 2,
    paddingRight: 8,
  },
  okBtn: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    left: (SIZE - 80) / 2,
    top: (SIZE - 80) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.okStart,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 7,
    elevation: 5,
  },
  okBtnPressed: {
    transform: [{ scale: 0.95 }],
    shadowOpacity: 0,
  },
  okText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
