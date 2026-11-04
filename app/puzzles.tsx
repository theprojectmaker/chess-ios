import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { PUZZLES } from '../lib/puzzles';
import { loadProgress } from '../lib/storage';
import { colors, radii, shadow } from '../lib/theme';

const THEME_LABELS: Record<string, string> = {
  mateIn1: 'Mate in 1',
  mateIn2: 'Mate in 2',
  fork: 'Fork',
  pin: 'Pin',
  skewer: 'Skewer',
  backRank: 'Back rank',
  discoveredAttack: 'Discovered attack',
  deflection: 'Deflection',
  hangingPiece: 'Free piece',
  endgame: 'Endgame',
};

const DIFFICULTY_DOTS = ['●', '●●', '●●●', '●●●●', '●●●●●'];

export default function PuzzlesScreen() {
  const router = useRouter();
  const [solved, setSolved] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadProgress().then((p) => {
        if (active) setSolved(p.puzzlesSolved);
      });
      return () => {
        active = false;
      };
    }, [])
  );

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={PUZZLES}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>Tactics Practice</Text>
          <Text style={styles.subtitle}>
            {solved.length}/{PUZZLES.length} solved — pick any puzzle below
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        const isSolved = solved.includes(item.id);
        return (
          <Pressable style={styles.card} onPress={() => router.push(`/puzzle/${item.id}`)}>
            <View style={[styles.checkCircle, isSolved && styles.checkCircleDone]}>
              <Text style={styles.checkMark}>{isSolved ? '✓' : ''}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardMeta}>
                {THEME_LABELS[item.theme] ?? item.theme} · {DIFFICULTY_DOTS[item.difficulty - 1]}
              </Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  header: { marginBottom: 6 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: 6 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: 14,
    marginBottom: 10,
    ...shadow,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkMark: { color: colors.white, fontWeight: '800' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  cardMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
