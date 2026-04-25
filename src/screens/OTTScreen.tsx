import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Globe } from 'lucide-react-native';
import { Colors } from '../constants/colors';

// Telugu and South Indian OTT deep-links / app IDs for each device type
const OTT_APPS = [
  { id: 'aha',       name: 'aha',          desc: 'Telugu originals',   color: '#FF6B00' },
  { id: 'hotstar',   name: 'JioHotstar',   desc: 'Star, Disney+',      color: '#1A3A8A' },
  { id: 'amazon',    name: 'Prime Video',  desc: 'Originals & movies', color: '#00A8E1' },
  { id: 'netflix',   name: 'Netflix',      desc: 'Global originals',   color: '#E50914' },
  { id: 'youtube',   name: 'YouTube',      desc: 'Free movies & music',color: '#FF0033' },
  { id: 'zee5',      name: 'ZEE5',         desc: 'ZEE Telugu',         color: '#6B3FA0' },
  { id: 'sunnxt',    name: 'Sun NXT',      desc: 'Sun TV content',     color: '#FF5500' },
  { id: 'manorama',  name: 'Manorama Max', desc: 'Malayalam content',  color: '#E31E24' },
];

interface Props {
  onLaunch: (id: string) => void;
}

export function OTTScreen({ onLaunch }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Globe size={12} color={Colors.textSecondary} />
        <Text style={styles.heading}>South Indian OTT</Text>
      </View>
      <View style={styles.list}>
        {OTT_APPS.map(app => (
          <Pressable
            key={app.id}
            style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
            onPress={() => onLaunch(app.id)}
          >
            <View style={[styles.colorDot, { backgroundColor: app.color }]} />
            <View style={styles.info}>
              <Text style={styles.appName}>{app.name}</Text>
              <Text style={styles.appDesc}>{app.desc}</Text>
            </View>
            <Text style={styles.launch}>▶</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.note}>
        Tapping an OTT shortcut launches the app on your active device.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  heading: {
    color: Colors.textSecondary,
    fontFamily: 'monospace',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 2.5,
  },
  list: { gap: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: Colors.btnStart,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  itemPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.85,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  info: { flex: 1 },
  appName: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  appDesc: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  launch: {
    color: Colors.amber,
    fontSize: 12,
  },
  note: {
    marginTop: 16,
    color: Colors.textSecondary,
    fontSize: 10,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
});
