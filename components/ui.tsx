import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, MAX_CONTENT } from '../lib/theme';
import { haptic } from '../lib/sound';
import { holdToasts } from '../lib/toast';

const LIP = 5;

interface ButtonProps {
  label: string;
  onPress?: () => void;
  color?: string;
  lip?: string;
  textColor?: string;
  outline?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  small?: boolean;
  a11yLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function ChunkyButton({ label, onPress, color = colors.leaf, lip = colors.leafLip, textColor, outline, disabled, icon, small, a11yLabel, style }: ButtonProps) {
  const face = disabled ? colors.line : outline ? colors.page : color;
  const under = disabled ? colors.line : outline ? colors.lineLip : lip;
  const ink = disabled ? colors.faint : textColor ?? (outline ? colors.muted : colors.page);
  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      onPress={() => {
        haptic('light');
        onPress?.();
      }}
      style={style}
    >
      {({ pressed }) => (
        <View style={[styles.btnTrack, { backgroundColor: under, paddingBottom: pressed ? 0 : LIP, marginTop: pressed ? LIP : 0 }]}>
          <View
            style={[
              styles.btnFace,
              small && styles.btnFaceSmall,
              { backgroundColor: face },
              outline && !disabled && { borderWidth: 2, borderColor: colors.line },
            ]}
          >
            {icon}
            {label ? <Text style={[styles.btnLabel, small && styles.btnLabelSmall, { color: ink }]}>{label}</Text> : null}
          </View>
        </View>
      )}
    </Pressable>
  );
}

export function Card({ children, style, onPress, tint, edge }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; tint?: string; edge?: string }) {
  const edgeColor = edge ?? colors.line;
  const body = (pressed: boolean) => (
    <View
      style={[
        styles.card,
        { backgroundColor: tint ?? colors.page, borderColor: edgeColor, borderBottomWidth: pressed ? 2 : 5, marginTop: pressed ? 3 : 0 },
        style,
      ]}
    >
      {children}
    </View>
  );
  if (!onPress) return body(false);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptic('light');
        onPress();
      }}
    >
      {({ pressed }) => body(pressed)}
    </Pressable>
  );
}

export function ProgressBar({ value, color = colors.leaf, height = 16 }: { value: number; color?: string; height?: number }) {
  const anim = useRef(new Animated.Value(value)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: value, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [value, anim]);
  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={[styles.barTrack, { height, borderRadius: height / 2 }]}>
      <Animated.View style={[styles.barFill, { width, backgroundColor: color, borderRadius: height / 2 }]}>
        <View style={[styles.barShine, { top: height * 0.2, height: Math.max(3, height * 0.22), borderRadius: height }]} />
      </Animated.View>
    </View>
  );
}

export function Sheet({ visible, onClose, children, canDismiss = true, overlay }: { visible: boolean; onClose?: () => void; children: React.ReactNode; canDismiss?: boolean; overlay?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  useEffect(() => (visible ? holdToasts() : undefined), [visible]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={canDismiss ? onClose : undefined}>
      <View style={styles.sheetRoot}>
        <Pressable accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={canDismiss ? onClose : undefined} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>{children}</View>
        {overlay}
      </View>
    </Modal>
  );
}

export function Display({ children, size = 26, color = colors.ink, style, center }: { children: React.ReactNode; size?: number; color?: string; style?: StyleProp<TextStyle>; center?: boolean }) {
  return <Text style={[{ fontFamily: fonts.display, fontSize: size, color, lineHeight: size * 1.18 }, center && { textAlign: 'center' }, style]}>{children}</Text>;
}

export function Body({ children, size = 15, color = colors.muted, style, bold, center, numberOfLines }: { children: React.ReactNode; size?: number; color?: string; style?: StyleProp<TextStyle>; bold?: boolean; center?: boolean; numberOfLines?: number }) {
  return (
    <Text numberOfLines={numberOfLines} style={[{ fontFamily: bold ? fonts.bold : fonts.body, fontSize: size, color, lineHeight: size * 1.35 }, center && { textAlign: 'center' }, style]}>
      {children}
    </Text>
  );
}

export function Stat({ icon, value, label, tint, edge }: { icon: React.ReactNode; value: string; label: string; tint?: string; edge?: string }) {
  return (
    <View style={[styles.stat, { backgroundColor: tint ?? colors.page, borderColor: edge ?? colors.line }]}>
      {icon}
      <Display size={22} style={{ marginTop: 4 }}>{value}</Display>
      <Body size={12} bold>{label}</Body>
    </View>
  );
}

export const webNoSelect = Platform.OS === 'web' ? ({ userSelect: 'none', touchAction: 'none' } as unknown as ViewStyle) : null;

const styles = StyleSheet.create({
  btnTrack: { borderRadius: 16 },
  btnFace: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 16, minHeight: 50 },
  btnFaceSmall: { paddingVertical: 8, paddingHorizontal: 12, minHeight: 40 },
  btnLabel: { fontFamily: fonts.bold, fontSize: 16, letterSpacing: 0.6, textTransform: 'uppercase' },
  btnLabelSmall: { fontSize: 13, letterSpacing: 0.3 },
  card: { borderWidth: 2, borderRadius: 18, padding: 14 },
  barTrack: { flex: 1, backgroundColor: colors.line, overflow: 'hidden' },
  barFill: { height: '100%' },
  barShine: { position: 'absolute', left: 8, right: 8, backgroundColor: 'rgba(255,255,255,0.4)' },
  sheetRoot: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(20, 30, 40, 0.45)' },
  sheet: { width: '100%', maxWidth: MAX_CONTENT, backgroundColor: colors.page, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 20, gap: 12 },
  stat: { flex: 1, borderWidth: 2, borderBottomWidth: 5, borderRadius: 16, paddingVertical: 12, alignItems: 'center' },
});
