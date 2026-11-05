import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LABELS, type Label } from '../lib/classify';
import { colors, fonts } from '../lib/theme';
import { Piece } from './Piece';
import { Body } from './ui';

const START_COUNT: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const ORDER = ['q', 'r', 'b', 'n', 'p'];

export function capturedFrom(fen: string) {
  const counts: Record<string, number> = {};
  for (const ch of fen.split(' ')[0]) if (/[a-zA-Z]/.test(ch)) counts[ch] = (counts[ch] ?? 0) + 1;
  // Lost pieces per color. Promotions can push a count over its start value, so clamp at zero.
  const lost = { w: [] as string[], b: [] as string[] };
  let diff = 0;
  for (const type of ORDER) {
    const white = counts[type.toUpperCase()] ?? 0;
    const black = counts[type] ?? 0;
    for (let i = white; i < START_COUNT[type]; i++) lost.w.push(type);
    for (let i = black; i < START_COUNT[type]; i++) lost.b.push(type);
    diff += (white - black) * VALUE[type];
  }
  return { lost, diff };
}

export function CapturedRow({ pieces, color, advantage }: { pieces: string[]; color: 'w' | 'b'; advantage: number }) {
  return (
    <View style={styles.captured}>
      {pieces.map((t, i) => (
        <View key={i} style={{ marginRight: -8 }}><Piece type={t} color={color} size={20} /></View>
      ))}
      {advantage > 0 && <Body size={13} bold style={{ marginLeft: 12 }}>+{advantage}</Body>}
    </View>
  );
}

export function LabelDot({ label, size = 24 }: { label: Label; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: LABELS[label].color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#FFFFFF', fontFamily: fonts.displayBold, fontSize: size * 0.56, lineHeight: size * 0.72 }}>{LABELS[label].symbol}</Text>
    </View>
  );
}

export function ActionButton({ label, icon, onPress, disabled, active }: { label: string; icon: React.ReactNode; onPress: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} style={[styles.action, disabled && { opacity: 0.4 }]}>
      {({ pressed }) => (
        <View style={[styles.actionFace, active && { borderColor: colors.sky, backgroundColor: colors.skyWash }, { borderBottomWidth: pressed ? 2 : 5, marginTop: pressed ? 3 : 0 }]}>
          {icon}
          <Body size={12} bold>{label}</Body>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  captured: { flexDirection: 'row', alignItems: 'center', height: 22, paddingRight: 8 },
  action: { flex: 1 },
  actionFace: { alignItems: 'center', gap: 2, paddingVertical: 7, borderWidth: 2, borderColor: colors.line, borderRadius: 14 },
});
