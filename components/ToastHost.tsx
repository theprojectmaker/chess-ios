import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { play } from '../lib/sound';
import { onToast } from '../lib/toast';
import { colors } from '../lib/theme';
import { StarIcon } from './Icons';
import { Body, Display } from './ui';

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [item, setItem] = useState<{ title: string; text: string } | null>(null);
  const queue = useRef<{ title: string; text: string }[]>([]);
  const y = useRef(new Animated.Value(-140)).current;
  const busy = useRef(false);

  useEffect(() => {
    const next = () => {
      const t = queue.current.shift();
      if (!t) {
        busy.current = false;
        setItem(null);
        return;
      }
      busy.current = true;
      setItem(t);
      play('levelup');
      Animated.sequence([
        Animated.timing(y, { toValue: 0, duration: 260, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
        Animated.delay(2100),
        Animated.timing(y, { toValue: -140, duration: 220, useNativeDriver: true }),
      ]).start(next);
    };
    return onToast((title, text) => {
      queue.current.push({ title, text });
      if (!busy.current) next();
    });
  }, [y]);

  if (!item) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { top: insets.top + 8, transform: [{ translateY: y }] }]} accessibilityLiveRegion="polite">
      <View style={styles.card}>
        <StarIcon size={34} />
        <View style={{ flex: 1 }}>
          <Body size={12} bold color={colors.sunLip}>{item.title.toUpperCase()}</Body>
          <Display size={18}>{item.text}</Display>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 14, right: 14, alignItems: 'center', zIndex: 1000 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', maxWidth: 460, backgroundColor: colors.sunWash, borderWidth: 2, borderBottomWidth: 5, borderColor: colors.sun, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8 },
});
