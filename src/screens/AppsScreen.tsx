import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/colors';
import { KodiLogo, PrimeLogo, NetflixLogo, HotstarLogo, AhaLogo, YouTubeLogo } from '../components/logos';

const ALL_APPS = [
  { id: 'netflix', name: 'Netflix',     bg: '#000000', Logo: NetflixLogo },
  { id: 'prime',   name: 'Prime Video', bg: '#00A8E1', Logo: PrimeLogo   },
  { id: 'youtube', name: 'YouTube',     bg: '#0F0F0F', Logo: YouTubeLogo },
  { id: 'hotstar', name: 'JioHotstar',  bg: '#0F1B3D', Logo: HotstarLogo },
  { id: 'aha',     name: 'aha',         bg: '#FF6B00', Logo: AhaLogo     },
  { id: 'kodi',    name: 'Kodi',        bg: '#0E0E0E', Logo: KodiLogo    },
];

interface Props {
  onLaunch: (id: string) => void;
}

export function AppsScreen({ onLaunch }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.heading}>All Apps</Text>
      <View style={styles.grid}>
        {ALL_APPS.map(app => {
          const Logo = app.Logo;
          return (
            <Pressable
              key={app.id}
              style={({ pressed }) => [styles.tile, { backgroundColor: app.bg }, pressed && styles.tilePressed]}
              onPress={() => onLaunch(app.id)}
            >
              <View style={styles.logoWrap}>
                <Logo />
              </View>
              <Text style={styles.appName}>{app.name}</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 8 },
  heading: {
    color: Colors.textSecondary,
    fontFamily: 'monospace',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 2.5,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '47%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  tilePressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.85,
  },
  logoWrap: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    paddingBottom: 10,
    paddingHorizontal: 8,
  },
});
