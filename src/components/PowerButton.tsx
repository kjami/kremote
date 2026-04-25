import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Power } from 'lucide-react-native';
import { Colors } from '../constants/colors';

interface Props {
  onPress: () => void;
  pressed: boolean;
}

export function PowerButton({ onPress, pressed }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const glowRadius = useRef(new Animated.Value(0)).current;

  // Pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowRadius, { toValue: 12, duration: 1200, useNativeDriver: false }),
        Animated.timing(glowRadius, { toValue: 0,  duration: 1200, useNativeDriver: false }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [glowRadius]);

  useEffect(() => {
    Animated.spring(scale, {
      toValue: pressed ? 0.95 : 1,
      useNativeDriver: true,
      speed: 30,
    }).start();
  }, [pressed, scale]);

  return (
    <Pressable onPress={onPress}>
      <Animated.View style={[styles.wrapper, { transform: [{ scale }] }]}>
        <View style={styles.btn}>
          <Power size={20} color="#1a0f00" strokeWidth={2.5} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.amber,
    shadowColor: Colors.amber,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
});
