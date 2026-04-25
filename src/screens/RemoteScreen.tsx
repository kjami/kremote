import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  ArrowLeft, ChevronDown, ChevronUp, Home,
  Mic, Play, SkipBack, SkipForward, Volume1, Volume2, VolumeX,
} from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { RemoteKey } from '../types';
import { DPad } from '../components/DPad';
import { LabeledBtn } from '../components/LabeledBtn';
import { PowerButton } from '../components/PowerButton';
import { AppShortcuts } from '../components/AppShortcuts';

interface Props {
  onKey: (key: RemoteKey, label: string) => void;
  onLaunchApp: (id: string) => void;
  pressed: string | null;
}

function IconBtn({ id, Icon, onPress, pressed }: { id: string; Icon: React.ElementType; onPress: () => void; pressed: string | null }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed: p }) => [styles.iconBtn, (p || pressed === id) && styles.iconBtnPressed]}
    >
      <Icon size={16} color={Colors.textIcon} />
    </Pressable>
  );
}

export function RemoteScreen({ onKey, onLaunchApp, pressed }: Props) {
  const ic = Colors.textIcon;
  const sz = 15;

  return (
    <View>
      {/* Power / Mic / Home / Back */}
      <View style={styles.topRow}>
        <PowerButton onPress={() => onKey('power', 'Powering on…')} pressed={pressed === 'power'} />
        <IconBtn id="mic"  Icon={Mic}       onPress={() => onKey('mic',  'Listening…')} pressed={pressed} />
        <IconBtn id="home" Icon={Home}      onPress={() => onKey('home', 'Home')}        pressed={pressed} />
        <IconBtn id="back" Icon={ArrowLeft} onPress={() => onKey('back', 'Back')}        pressed={pressed} />
      </View>

      {/* D-Pad */}
      <DPad onPress={onKey} pressed={pressed} />

      {/* Unified controls grid — 4 cols × 2 rows */}
      <View style={styles.controlGrid}>
        <LabeledBtn id="volup"   label="VOL +" icon={<Volume2    size={sz} color={ic} />} onPress={() => onKey('volup',   'Vol +')}   pressed={pressed} />
        <LabeledBtn id="chup"    label="CH +"  icon={<ChevronUp  size={sz} color={ic} />} onPress={() => onKey('chup',    'Ch +')}    pressed={pressed} />
        <LabeledBtn id="mute"    label="MUTE"  icon={<VolumeX    size={sz} color={ic} />} onPress={() => onKey('mute',    'Mute')}    pressed={pressed} />
        <LabeledBtn id="play"    label="PLAY"  icon={<Play       size={sz} color={ic} />} onPress={() => onKey('play',    'Play')}    pressed={pressed} />

        <LabeledBtn id="voldown" label="VOL −" icon={<Volume1    size={sz} color={ic} />} onPress={() => onKey('voldown', 'Vol −')}   pressed={pressed} />
        <LabeledBtn id="chdown"  label="CH −"  icon={<ChevronDown size={sz} color={ic} />} onPress={() => onKey('chdown', 'Ch −')}   pressed={pressed} />
        <LabeledBtn id="rewind"  label="REW"   icon={<SkipBack   size={sz} color={ic} />} onPress={() => onKey('rewind',  'Rewind')} pressed={pressed} />
        <LabeledBtn id="forward" label="FWD"   icon={<SkipForward size={sz} color={ic} />} onPress={() => onKey('forward','Forward')} pressed={pressed} />
      </View>

      {/* Divider */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <View style={styles.dividerLine} />
      </View>

      {/* App shortcuts */}
      <AppShortcuts onLaunch={onLaunchApp} pressed={pressed} />
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.btnStart,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  iconBtnPressed: {
    transform: [{ scale: 0.95 }],
    shadowOpacity: 0,
  },
  controlGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 28,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.borderDivider,
    opacity: 0.5,
  },
});
