import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Colors } from '../constants/colors';
import { KodiLogo, PrimeLogo, NetflixLogo, HotstarLogo, AhaLogo, YouTubeLogo } from './logos';

const APPS = [
  { id: 'kodi',    bg: '#0E0E0E', Logo: KodiLogo    },
  { id: 'prime',   bg: '#00A8E1', Logo: PrimeLogo   },
  { id: 'netflix', bg: '#000000', Logo: NetflixLogo },
  { id: 'hotstar', bg: '#0F1B3D', Logo: HotstarLogo },
  { id: 'aha',     bg: '#FF6B00', Logo: AhaLogo     },
  { id: 'youtube', bg: '#0F0F0F', Logo: YouTubeLogo },
];

interface Props {
  onLaunch: (appId: string) => void;
  pressed: string | null;
}

export function AppShortcuts({ onLaunch, pressed }: Props) {
  return (
    <View style={styles.grid}>
      {APPS.map(app => {
        const Logo = app.Logo;
        return (
          <Pressable
            key={app.id}
            onPress={() => onLaunch(app.id)}
            style={({ pressed: p }) => [
              styles.tile,
              { backgroundColor: app.bg },
              (p || pressed === app.id) && styles.tilePressed,
            ]}
          >
            <Logo />
          </Pressable>
        );
      })}
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
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
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
});
