import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LABELS, type Label } from '../lib/classify';
import { fonts, themed } from '../lib/theme';

const BIG: Label[] = ['brilliant', 'great'];
const SHOWN: Label[] = ['brilliant', 'great', 'best', 'excellent', 'mistake', 'miss', 'blunder'];

/** The big moment on the board after a notable move. Quiet labels stay as the small badge only. */
export function MoveBurst({ label, boardSize }: { label: Label; boardSize: number }) {
  const scale = useRef(new Animated.Value(0.2)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const big = BIG.includes(label);
  const shown = SHOWN.includes(label);

  useEffect(() => {
    if (!shown) return;
    const hold = big ? 1100 : 620;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 150, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 110, useNativeDriver: true }),
        Animated.delay(hold),
        Animated.timing(opacity, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]),
      Animated.timing(spin, { toValue: 1, duration: hold + 370, easing: Easing.linear, useNativeDriver: true }),
    ]).start();
  }, [big, shown, scale, opacity, spin]);

  if (!shown) return null;
  const info = LABELS[label];
  const coin = boardSize * (big ? 0.34 : 0.24);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '70deg'] });
  const rays = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const w = 0.13;
    rays.push(`M50 50L${50 + Math.cos(a - w) * 50} ${50 + Math.sin(a - w) * 50}L${50 + Math.cos(a + w) * 50} ${50 + Math.sin(a + w) * 50}Z`);
  }
  return (
    <View pointerEvents="none" style={styles.wrap} accessibilityLiveRegion="polite" accessibilityLabel={info.name}>
      <Animated.View style={{ alignItems: 'center', opacity, transform: [{ scale }] }}>
        <View style={{ width: coin * 1.9, height: coin * 1.9, alignItems: 'center', justifyContent: 'center' }}>
          {big && (
            <Animated.View style={{ position: 'absolute', transform: [{ rotate }] }}>
              <Svg width={coin * 1.9} height={coin * 1.9} viewBox="0 0 100 100">
                <Path d={rays.join('')} fill={info.color} opacity={0.45} />
              </Svg>
            </Animated.View>
          )}
          <View style={{ width: coin, height: coin + 7, borderRadius: coin / 2, backgroundColor: '#00000033' }}>
            <View style={[styles.coin, { width: coin, height: coin, borderRadius: coin / 2, backgroundColor: info.color }]}>
              <Animated.Text style={{ color: '#FFFFFF', fontFamily: fonts.displayBold, fontSize: coin * 0.5, lineHeight: coin * 0.62 }}>{info.symbol}</Animated.Text>
            </View>
          </View>
        </View>
        <View style={[styles.pill, { backgroundColor: info.color, marginTop: -coin * 0.28 }]}>
          <Animated.Text style={{ color: '#FFFFFF', fontFamily: fonts.displayBold, fontSize: big ? 24 : 17 }}>{info.name}</Animated.Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = themed(() => ({
  wrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 90 },
  coin: { alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF' },
  pill: { paddingHorizontal: 14, paddingVertical: 3, borderRadius: 999, borderWidth: 2, borderColor: '#FFFFFF' },
}));
