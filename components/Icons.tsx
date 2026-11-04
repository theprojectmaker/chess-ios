import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../lib/theme';

interface IconProps {
  size?: number;
  color?: string;
  muted?: boolean;
}

export function FlameIcon({ size = 24, muted }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2C13 6.5 19 9 19 15a7 7 0 0 1-14 0c0-3 1.6-5 3-6.2.3 1.7 1 2.7 2 3.2C9.8 8.5 10.4 5 12 2Z" fill={muted ? '#CFD8E1' : colors.flame} />
      <Path d="M12 12.5c.6 1.8 3 2.8 3 5.2a3 3 0 0 1-6 0c0-1.9 2-3.1 3-5.2Z" fill={muted ? '#E3E9EF' : '#FFD23F'} />
    </Svg>
  );
}

export function BoltIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M13.5 2 5 13.5h5.5L9.5 22 19 9.8h-6L13.5 2Z" fill={colors.sun} stroke={colors.sunLip} strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  );
}

export function HeartIcon({ size = 24, muted }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 21.5C5 16 2 12.5 2 8.5 2 5.4 4.4 3 7.4 3c1.9 0 3.6 1 4.6 2.6C13 4 14.7 3 16.6 3 19.6 3 22 5.4 22 8.5c0 4-3 7.5-10 13Z" fill={muted ? '#DCE3EA' : colors.coral} />
      {!muted && <Path d="M6 8.5c0-1.4 1-2.5 2.3-2.6" fill="none" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={2} strokeLinecap="round" />}
    </Svg>
  );
}

export function LockIcon({ size = 24, color = '#A9B6C2' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M7.5 11V8a4.5 4.5 0 0 1 9 0v3" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" />
      <Rect x={4.5} y={10.5} width={15} height={11} rx={3} fill={color} />
    </Svg>
  );
}

export function CheckIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4.5 12.8 9.8 18 19.5 6.8" fill="none" stroke={color} strokeWidth={3.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CloseIcon({ size = 24, color = colors.faint }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5.5 5.5 18.5 18.5M18.5 5.5 5.5 18.5" fill="none" stroke={color} strokeWidth={3.6} strokeLinecap="round" />
    </Svg>
  );
}

export function BackIcon({ size = 24, color = colors.faint }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M15 4.5 7.5 12l7.5 7.5" fill="none" stroke={color} strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ForwardIcon({ size = 24, color = colors.faint }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M9 4.5 16.5 12 9 19.5" fill="none" stroke={color} strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function UndoIcon({ size = 24, color = colors.muted }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M8.5 5 4 9.5 8.5 14" fill="none" stroke={color} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M4.5 9.5H14a5.5 5.5 0 0 1 0 11h-3" fill="none" stroke={color} strokeWidth={3.2} strokeLinecap="round" />
    </Svg>
  );
}

export function BulbIcon({ size = 24, color = colors.sunLip }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2.5a7 7 0 0 0-4 12.7V17h8v-1.8A7 7 0 0 0 12 2.5Z" fill={colors.sun} stroke={color} strokeWidth={1.6} />
      <Rect x={9} y={18.5} width={6} height={3} rx={1.5} fill={color} />
    </Svg>
  );
}

export function FlagIcon({ size = 24, color = colors.muted }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6 22V3" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" />
      <Path d="M6 4c4-2 7 2 13 0v9c-6 2-9-2-13 0V4Z" fill={color} />
    </Svg>
  );
}

export function FlipIcon({ size = 24, color = colors.muted }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M7 20V5M7 5 3 9M7 5l4 4" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M17 4v15M17 19l-4-4M17 19l4-4" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function StarIcon({ size = 24, muted }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="m12 2.5 2.9 6.1 6.6.9-4.8 4.6 1.2 6.6-5.9-3.2-5.9 3.2 1.2-6.6L2.5 9.5l6.6-.9L12 2.5Z" fill={muted ? '#DCE3EA' : colors.sun} stroke={muted ? '#CFD8E1' : colors.sunLip} strokeWidth={1.4} strokeLinejoin="round" />
    </Svg>
  );
}

export function PathIcon({ size = 26, color = colors.muted }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={7} cy={5.5} r={3.5} fill={color} />
      <Circle cx={17} cy={12} r={3.5} fill={color} />
      <Circle cx={7} cy={18.5} r={3.5} fill={color} />
      <Path d="M9.5 8 14.5 10M14.5 14 9.5 16" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

export function BoardIcon({ size = 26, color = colors.muted }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3} y={3} width={18} height={18} rx={3.5} fill={color} />
      <Rect x={7.5} y={7.5} width={4.5} height={4.5} fill="#FFFFFF" />
      <Rect x={12} y={12} width={4.5} height={4.5} fill="#FFFFFF" />
    </Svg>
  );
}

export function ChartIcon({ size = 26, color = colors.muted }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3} y={12} width={5} height={9} rx={1.5} fill={color} />
      <Rect x={9.5} y={7} width={5} height={14} rx={1.5} fill={color} />
      <Rect x={16} y={3} width={5} height={18} rx={1.5} fill={color} />
    </Svg>
  );
}
