import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/colors';

interface Props {
  id: string;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  pressed: string | null;
}

export function LabeledBtn({ id, label, icon, onPress, pressed }: Props) {
  const isPressed = pressed === id;
  return (
    <Pressable onPress={onPress} style={({ pressed: p }) => [styles.btn, (p || isPressed) && styles.btnPressed]}>
      {icon}
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: '23%',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    backgroundColor: Colors.btnStart,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 3,
  },
  btnPressed: {
    transform: [{ translateY: 1 }, { scale: 0.97 }],
    shadowOpacity: 0,
    elevation: 0,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 8,
    fontFamily: 'monospace',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
