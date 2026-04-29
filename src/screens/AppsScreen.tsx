import React, { useEffect } from 'react';
import {
  ActivityIndicator, Image, Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { Star, Tv } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { DeviceApp } from '../types';

interface Props {
  apps: DeviceApp[];
  loading: boolean;
  favoriteIds: Set<string>;
  onLaunch: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onRefresh: () => Promise<void> | void;
  deviceName: string | null;
}

export function AppsScreen({
  apps, loading, favoriteIds, onLaunch, onToggleFavorite, onRefresh, deviceName,
}: Props) {
  useEffect(() => {
    // Auto-fetch on first mount if list is empty.
    if (apps.length === 0 && !loading) onRefresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={() => onRefresh()}
          tintColor={Colors.amber}
          colors={[Colors.amber]}
        />
      }
    >
      <View style={styles.header}>
        <Tv size={12} color={Colors.textSecondary} />
        <Text style={styles.heading}>
          Apps on {deviceName ?? 'TV'}
        </Text>
      </View>

      {loading && apps.length === 0 && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={Colors.amber} />
          <Text style={styles.loadingText}>Loading apps from device…</Text>
        </View>
      )}

      {!loading && apps.length === 0 && (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>
            No apps available from this device.{'\n'}Pull down to refresh.
          </Text>
        </View>
      )}

      <View style={styles.list}>
        {apps.map(app => {
          const isFav = favoriteIds.has(app.id);
          return (
            <Pressable
              key={app.id}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => onLaunch(app.id)}
            >
              {app.iconUrl ? (
                <Image source={{ uri: app.iconUrl }} style={styles.icon} />
              ) : (
                <View style={styles.iconFallback}>
                  <Text style={styles.iconFallbackText}>{app.name.slice(0, 1).toUpperCase()}</Text>
                </View>
              )}

              <View style={styles.info}>
                <Text style={styles.appName} numberOfLines={1}>{app.name}</Text>
              </View>

              <Pressable
                hitSlop={8}
                onPress={(e) => { e.stopPropagation?.(); onToggleFavorite(app.id); }}
                style={styles.starBtn}
              >
                <Star
                  size={20}
                  color={isFav ? Colors.amber : Colors.textSecondary}
                  fill={isFav ? Colors.amber : 'transparent'}
                />
              </Pressable>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 8, paddingBottom: 24 },
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
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 24,
    justifyContent: 'center',
  },
  loadingText: { color: Colors.textSecondary, fontSize: 12 },
  emptyWrap: { paddingVertical: 24, alignItems: 'center' },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: Colors.btnStart,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rowPressed: { opacity: 0.7 },
  icon: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#000' },
  iconFallback: {
    width: 36, height: 36, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.dpadHighlight,
  },
  iconFallbackText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  info: { flex: 1 },
  appName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '500' },
  starBtn: { padding: 6 },
});
