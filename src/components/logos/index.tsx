import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Text, Path, Rect, Circle } from 'react-native-svg';

export function KodiLogo() {
  return (
    <Svg viewBox="0 0 100 60" width="70%" height="100%">
      <Defs>
        <LinearGradient id="kodiGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#3FC7F4" />
          <Stop offset="100%" stopColor="#1A8BC9" />
        </LinearGradient>
      </Defs>
      <Text x="50" y="40" textAnchor="middle" fontFamily="sans-serif"
            fontSize="32" fontWeight="700" fill="url(#kodiGrad)" letterSpacing="-1">
        kodi
      </Text>
      <Path d="M 50 48 L 56 54 L 50 54 L 44 54 Z" fill="#3FC7F4" opacity="0.8" />
    </Svg>
  );
}

export function PrimeLogo() {
  return (
    <Svg viewBox="0 0 100 60" width="80%" height="100%">
      <Text x="50" y="26" textAnchor="middle" fontFamily="sans-serif"
            fontSize="13" fontWeight="700" fill="#ffffff" letterSpacing="0.5">
        prime
      </Text>
      <Text x="50" y="40" textAnchor="middle" fontFamily="sans-serif"
            fontSize="10" fontWeight="500" fill="#ffffff" letterSpacing="2">
        video
      </Text>
      <Path d="M 30 48 Q 50 56 70 48" stroke="#ffffff" strokeWidth="2"
            fill="none" strokeLinecap="round" />
    </Svg>
  );
}

export function NetflixLogo() {
  return (
    <Svg viewBox="0 0 60 60" width="55%" height="100%">
      <Defs>
        <LinearGradient id="nflxGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#E50914" />
          <Stop offset="100%" stopColor="#831010" />
        </LinearGradient>
      </Defs>
      <Path d="M 14 6 L 14 54 L 22 54 L 22 28 L 38 54 L 46 54 L 46 6 L 38 6 L 38 32 L 22 6 Z"
            fill="url(#nflxGrad)" />
    </Svg>
  );
}

export function HotstarLogo() {
  return (
    <Svg viewBox="0 0 100 60" width="80%" height="100%">
      <Defs>
        <LinearGradient id="hsGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#FFD700" />
          <Stop offset="100%" stopColor="#FF8A00" />
        </LinearGradient>
      </Defs>
      <Path d="M 50 8 L 53 24 L 68 27 L 53 30 L 50 46 L 47 30 L 32 27 L 47 24 Z"
            fill="url(#hsGrad)" />
      <Text x="50" y="56" textAnchor="middle" fontFamily="sans-serif"
            fontSize="9" fontWeight="600" fill="#ffffff" letterSpacing="1.5">
        JIOHOTSTAR
      </Text>
    </Svg>
  );
}

export function AhaLogo() {
  return (
    <Svg viewBox="0 0 100 60" width="70%" height="100%">
      <Text x="50" y="44" textAnchor="middle" fontFamily="sans-serif"
            fontSize="36" fontWeight="800" fill="#ffffff" letterSpacing="-2">
        aha
      </Text>
      <Circle cx="76" cy="22" r="3" fill="#ffffff" />
    </Svg>
  );
}

export function YouTubeLogo() {
  return (
    <Svg viewBox="0 0 100 60" width="70%" height="100%">
      <Defs>
        <LinearGradient id="ytGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FF0033" />
          <Stop offset="100%" stopColor="#CC0022" />
        </LinearGradient>
      </Defs>
      <Rect x="14" y="14" width="72" height="32" rx="8" ry="8" fill="url(#ytGrad)" />
      <Path d="M 44 22 L 44 38 L 58 30 Z" fill="#ffffff" />
      <Text x="50" y="56" textAnchor="middle" fontFamily="sans-serif"
            fontSize="8" fontWeight="700" fill="#ffffff" letterSpacing="2">
        YOUTUBE
      </Text>
    </Svg>
  );
}
