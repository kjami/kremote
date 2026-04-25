import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gamepad2, Globe, Grid3x3, Keyboard } from 'lucide-react-native';
import { Colors } from '../constants/colors';

export type TabId = 'remote' | 'apps' | 'keyboard' | 'ott';

interface TabDef {
  id: TabId;
  label: string;
  icon: (color: string) => React.ReactNode;
}

const TABS: TabDef[] = [
  { id: 'remote',   label: 'Remote',   icon: c => <Gamepad2 size={18} color={c} /> },
  { id: 'apps',     label: 'Apps',     icon: c => <Grid3x3  size={18} color={c} /> },
  { id: 'keyboard', label: 'Keyboard', icon: c => <Keyboard size={18} color={c} /> },
  { id: 'ott',      label: 'OTT',      icon: c => <Globe    size={18} color={c} /> },
];

interface Props {
  active: TabId;
  onChange: (id: TabId) => void;
}

export function TabBar({ active, onChange }: Props) {
  return (
    <View style={styles.container}>
      {TABS.map(tab => {
        const isActive = active === tab.id;
        const color = isActive ? Colors.amber : '#6b7689';
        return (
          <Pressable key={tab.id} style={styles.tab} onPress={() => onChange(tab.id)}>
            {isActive && <View style={styles.activeIndicator} />}
            {tab.icon(color)}
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginTop: 24,
    marginHorizontal: -8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
    borderRadius: 12,
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.amber,
    shadowColor: Colors.amber,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 8,
    fontFamily: 'monospace',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  labelActive: {
    color: Colors.textPrimary,
  },
});
