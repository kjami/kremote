import { RemoteKey } from '../types';

// Sony BRAVIA IRCC (Infrared Command Codes) — Base64 encoded
export const SONY_IRCC: Record<RemoteKey, string> = {
  power:   'AAAAAQAAAAEAAAAVAw==',
  up:      'AAAAAQAAAAEAAAB0Aw==',
  down:    'AAAAAQAAAAEAAAB1Aw==',
  left:    'AAAAAQAAAAEAAAB2Aw==',
  right:   'AAAAAQAAAAEAAAB3Aw==',
  ok:      'AAAAAQAAAAEAAAAkAw==',
  home:    'AAAAAQAAAAEAAABgAw==',
  back:    'AAAAAgAAAJcAAAAjAw==',
  volup:   'AAAAAQAAAAEAAAASAw==',
  voldown: 'AAAAAQAAAAEAAAATAw==',
  mute:    'AAAAAQAAAAEAAAAUAw==',
  chup:    'AAAAAQAAAAEAAAAQAw==',
  chdown:  'AAAAAQAAAAEAAAARAw==',
  play:    'AAAAAgAAAJcAAAAaAw==',
  pause:   'AAAAAgAAAJcAAAAZAw==',
  rewind:  'AAAAAgAAAJcAAAAbAw==',
  forward: 'AAAAAgAAAJcAAAAcAw==',
  mic:     'AAAAAQAAAAEAAAAZAw==',
  settings:'AAAAAgAAAJcAAAA2Aw==',
  menu:    'AAAAAgAAAJcAAAA9Aw==',
};

// Samsung Tizen key codes
export const SAMSUNG_KEYS: Record<RemoteKey, string> = {
  power:   'KEY_POWER',
  up:      'KEY_UP',
  down:    'KEY_DOWN',
  left:    'KEY_LEFT',
  right:   'KEY_RIGHT',
  ok:      'KEY_ENTER',
  home:    'KEY_HOME',
  back:    'KEY_RETURN',
  volup:   'KEY_VOLUP',
  voldown: 'KEY_VOLDOWN',
  mute:    'KEY_MUTE',
  chup:    'KEY_CHUP',
  chdown:  'KEY_CHDOWN',
  play:    'KEY_PLAY',
  pause:   'KEY_PAUSE',
  rewind:  'KEY_REWIND',
  forward: 'KEY_FF',
  mic:     'KEY_MIC',
  settings:'KEY_MENU',
  menu:    'KEY_MENU',
};

// Amazon Firestick / Android ADB keycodes
export const FIRESTICK_KEYCODES: Record<RemoteKey, number> = {
  power:   26,
  up:      19,
  down:    20,
  left:    21,
  right:   22,
  ok:      23,
  home:    3,
  back:    4,
  volup:   24,
  voldown: 25,
  mute:    164,
  chup:    166,
  chdown:  167,
  play:    85,
  pause:   85,
  rewind:  89,
  forward: 90,
  mic:     220,
  settings:176,
  menu:    82,
};

// Sony app package names (for BRAVIA REST API launch)
export const SONY_APPS: Record<string, string> = {
  netflix:  'com.netflix.ninja',
  prime:    'com.amazon.avod.thirdpartyclient',
  youtube:  'com.google.android.youtube.tv',
  hotstar:  'in.startv.hotstar',
  aha:      'com.aha.ahatv',
  kodi:     'org.xbmc.kodi',
};

// Samsung app IDs (Tizen)
export const SAMSUNG_APPS: Record<string, string> = {
  netflix:  '11101200001',
  prime:    '3201910019365',
  youtube:  '111299001912',
  hotstar:  '3201601007230',
  aha:      '3201907018784',
  kodi:     '3201508003235',
};

// Firestick package names (ADB shell am start)
export const FIRESTICK_APPS: Record<string, string> = {
  netflix:  'com.netflix.ninja/.MainActivity',
  prime:    'com.amazon.avod.thirdpartyclient/.LauncherActivity',
  youtube:  'com.amazon.youtubetv/.MainActivity',
  hotstar:  'in.startv.hotstar/com.hotstar.ui.SplashActivity',
  aha:      'com.aha.ahatv/.activities.SplashActivity',
  kodi:     'org.xbmc.kodi/org.xbmc.kodi.Splash',
};
