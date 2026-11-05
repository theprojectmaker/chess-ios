import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import { colors } from '../lib/theme';

const PALETTE = [colors.leaf, colors.sky, colors.sun, colors.coral, colors.grape, colors.flame];

export function Confetti({ count = 36 }: { count?: number }) {
  const { width, height } = useWindowDimensions();
  const t = useRef(new Animated.Value(0)).current;
  const [reduced, setReduced] = useState(false);
  const bits = useMemo(
    () => Array.from({ length: count }, (_, i) => ({
      x: Math.random() * width,
      drift: (Math.random() - 0.5) * 120,
      spin: (Math.random() < 0.5 ? -1 : 1) * (180 + Math.random() * 540),
      size: 7 + Math.random() * 7,
      delay: Math.random() * 0.3,
      color: PALETTE[i % PALETTE.length],
    })),
    [count, width],
  );
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {});
    Animated.timing(t, { toValue: 1, duration: 1900, easing: Easing.linear, useNativeDriver: true }).start();
  }, [t]);
  if (reduced) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {bits.map((b, i) => {
        const translateY = t.interpolate({ inputRange: [0, b.delay, 1], outputRange: [-30, -30, height + 30] });
        const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [b.x, b.x + b.drift] });
        const rotate = t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${b.spin}deg`] });
        return <Animated.View key={i} style={{ position: 'absolute', width: b.size, height: b.size * 0.6, borderRadius: 2, backgroundColor: b.color, transform: [{ translateX }, { translateY }, { rotate }] }} />;
      })}
    </View>
  );
}
