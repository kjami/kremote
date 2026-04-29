import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { DeviceApp } from '../types';

interface Props {
  apps: DeviceApp[];
  onLaunch: (appId: string) => void;
  pressed: string | null;
}

export function AppShortcuts({ apps, onLaunch, pressed }: Props) {
  if (apps.length === 0) {
    return (
      <View style={styles.empty}>
        <Star size={18} color={Colors.textSecondary} />
        <Text style={styles.emptyText}>
          Star apps in the Apps tab to pin them here.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {apps.map(app => (
        <Pressable
          key={app.id}
          onPress={() => onLaunch(app.id)}
          style={({ pressed: p }) => [
            styles.tile,
            (p || pressed === app.id) && styles.tilePressed,
          ]}
        >
          {app.iconUrl ? (
            <Image source={{ uri: app.iconUrl }} style={styles.icon} />
          ) : (
            <View style={styles.iconFallback}>
              <Text style={styles.iconFallbackText}>{app.name.slice(0, 1).toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.name} numberOfLines={1}>{app.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    flexBasis: '30%',
    flexGrow: 1,
    aspectRatio: 5 / 3,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.btnStart,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
    paddingHorizontal: 6,
  },
  tilePressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.85,
  },
  icon: { width: 32, height: 32, borderRadius: 6, backgroundColor: '#000' },
  iconFallback: {
    width: 32, height: 32, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.dpadHighlight,
  },
  iconFallbackText: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },
  name: { color: Colors.textPrimary, fontSize: 10, textAlign: 'center' },

  empty: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});
