import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { Teacher } from '../lib/teachers';
import { colors, themed } from '../lib/theme';
import { Piece } from './Piece';
import { Body } from './ui';

export type Mood = 'happy' | 'wow' | 'sad';

export function TeacherFace({ teacher, size = 48, mood = 'happy' }: { teacher: Teacher; size?: number; mood?: Mood }) {
  const mouth =
    mood === 'wow' ? <Circle cx={50} cy={64} r={7} fill="#3B2A22" />
    : mood === 'sad' ? <Path d="M38 68C43 60 57 60 62 68" fill="none" stroke="#3B2A22" strokeWidth={4.5} strokeLinecap="round" />
    : <Path d="M36 60C41 71 59 71 64 60" fill="none" stroke="#3B2A22" strokeWidth={4.5} strokeLinecap="round" />;
  return (
    <View style={{ width: size, height: size + 4, borderRadius: size / 2, backgroundColor: teacher.lip }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: teacher.color, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', opacity: 0.32 }}><Piece type={teacher.piece} color="w" size={size * 0.98} /></View>
        <Svg width={size * 0.82} height={size * 0.82} viewBox="0 0 100 100">
          <Circle cx={36} cy={42} r={9} fill="#FFFFFF" />
          <Circle cx={64} cy={42} r={9} fill="#FFFFFF" />
          <Circle cx={38} cy={43} r={4.6} fill="#3B2A22" />
          <Circle cx={66} cy={43} r={4.6} fill="#3B2A22" />
          {mouth}
        </Svg>
      </View>
    </View>
  );
}

export function TeacherBubble({ teacher, text, mood, tint, edge, chip }: { teacher: Teacher; text: string; mood?: Mood; tint?: string; edge?: string; chip?: React.ReactNode }) {
  return (
    <View style={styles.row} accessibilityLiveRegion="polite">
      <TeacherFace teacher={teacher} size={42} mood={mood} />
      <View style={[styles.bubble, { backgroundColor: tint ?? colors.wash, borderColor: edge ?? colors.line }]}>
        {chip}
        <Body size={14} bold color={colors.ink} numberOfLines={3}>{text}</Body>
      </View>
    </View>
  );
}

const styles = themed(() => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8 },
  bubble: { flex: 1, borderWidth: 2, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, gap: 2 },
}));
