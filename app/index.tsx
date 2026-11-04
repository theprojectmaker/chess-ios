import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DEFAULT_PROGRESS, loadProgress, type Progress } from '../lib/storage';
import { PUZZLES } from '../lib/puzzles';
import { colors, radii, shadow } from '../lib/theme';

export default function HomeScreen() {
  const router = useRouter();
  const [progress, setProgress] = useState<Progress>(DEFAULT_PROGRESS);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadProgress().then((p) => {
        if (active) setProgress(p);
      });
      return () => {
        active = false;
      };
    }, [])
  );

  const solvedCount = progress.puzzlesSolved.length;
  const totalPuzzles = PUZZLES.length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Chess Buddy ♟️</Text>
        <Text style={styles.subtitle}>Practice daily, climb the bot ladder, master tactics.</Text>
      </View>

      <View style={styles.statsRow}>
        <StatPill emoji="🔥" label="Day streak" value={String(progress.streak)} />
        <StatPill emoji="⭐" label="XP" value={String(progress.xp)} />
        <StatPill emoji="🧩" label="Puzzles" value={`${solvedCount}/${totalPuzzles}`} />
      </View>

      <Pressable style={[styles.card, styles.primaryCard]} onPress={() => router.push('/play')}>
        <Text style={styles.cardEmoji}>🤖</Text>
        <View style={styles.cardTextWrap}>
          <Text style={styles.cardTitle}>Play vs Bot</Text>
          <Text style={styles.cardSubtitle}>Pick a difficulty and play a full game.</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <Pressable style={styles.card} onPress={() => router.push('/puzzles')}>
        <Text style={styles.cardEmoji}>🧩</Text>
        <View style={styles.cardTextWrap}>
          <Text style={styles.cardTitle}>Puzzle Practice</Text>
          <Text style={styles.cardSubtitle}>Bite-sized tactics — find the best move.</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <View style={styles.recordCard}>
        <Text style={styles.recordTitle}>Your record</Text>
        <View style={styles.recordRow}>
          <RecordStat label="Played" value={progress.gamesPlayed} />
          <RecordStat label="Won" value={progress.gamesWon} />
          <RecordStat label="Drawn" value={progress.gamesDrawn} />
          <RecordStat label="Lost" value={progress.gamesLost} />
        </View>
      </View>
    </ScrollView>
  );
}

function StatPill({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillEmoji}>{emoji}</Text>
      <Text style={styles.pillValue}>{value}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

function RecordStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.recordStat}>
      <Text style={styles.recordValue}>{value}</Text>
      <Text style={styles.recordLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  header: { marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 10 },
  pill: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
    ...shadow,
  },
  pillEmoji: { fontSize: 20 },
  pillValue: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 2 },
  pillLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: 16,
    gap: 12,
    ...shadow,
  },
  primaryCard: {
    backgroundColor: colors.primary,
  },
  cardEmoji: { fontSize: 32 },
  cardTextWrap: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  cardSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  chevron: { fontSize: 28, color: colors.textMuted },
  recordCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: 16,
    marginTop: 6,
    ...shadow,
  },
  recordTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 },
  recordRow: { flexDirection: 'row', justifyContent: 'space-between' },
  recordStat: { alignItems: 'center' },
  recordValue: { fontSize: 20, fontWeight: '800', color: colors.primary },
  recordLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
