import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getLastReview } from '../lib/gameStore';
import { colors, radii, shadow } from '../lib/theme';

const RESULT_COPY: Record<string, { emoji: string; title: string; color: string }> = {
  win: { emoji: '🏆', title: 'Victory!', color: colors.primary },
  loss: { emoji: '🙂', title: 'Good effort', color: colors.danger },
  draw: { emoji: '🤝', title: "It's a draw", color: colors.secondary },
};

export default function ReviewScreen() {
  const router = useRouter();
  const review = getLastReview();

  if (!review) {
    return (
      <View style={styles.container}>
        <Text style={styles.missing}>No game to review yet.</Text>
        <Pressable style={styles.primaryButton} onPress={() => router.replace('/')}>
          <Text style={styles.primaryButtonText}>Home</Text>
        </Pressable>
      </View>
    );
  }

  const copy = RESULT_COPY[review.result];
  const movePairs: [string, string | undefined][] = [];
  for (let i = 0; i < review.moves.length; i += 2) {
    movePairs.push([review.moves[i], review.moves[i + 1]]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.resultCard}>
        <Text style={styles.resultEmoji}>{copy.emoji}</Text>
        <Text style={[styles.resultTitle, { color: copy.color }]}>{copy.title}</Text>
        <Text style={styles.resultReason}>
          {review.reason} · vs {review.botName} · you played {review.playerColor === 'w' ? 'White' : 'Black'}
        </Text>
      </View>

      <View style={styles.movesCard}>
        <Text style={styles.movesTitle}>Move list</Text>
        {movePairs.map((pair, idx) => (
          <View key={idx} style={styles.moveRow}>
            <Text style={styles.moveNumber}>{idx + 1}.</Text>
            <Text style={styles.moveText}>{pair[0]}</Text>
            <Text style={styles.moveText}>{pair[1] ?? ''}</Text>
          </View>
        ))}
        {movePairs.length === 0 && <Text style={styles.movesTitle}>No moves recorded.</Text>}
      </View>

      <View style={styles.buttonRow}>
        <Pressable style={styles.secondaryButton} onPress={() => router.replace('/play')}>
          <Text style={styles.secondaryButtonText}>Play again</Text>
        </Pressable>
        <Pressable style={styles.primaryButton} onPress={() => router.replace('/')}>
          <Text style={styles.primaryButtonText}>Home</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 14, paddingBottom: 40, alignItems: 'stretch' },
  missing: { color: colors.textMuted, marginTop: 40, textAlign: 'center' },
  resultCard: { backgroundColor: colors.card, borderRadius: radii.lg, padding: 22, alignItems: 'center', ...shadow },
  resultEmoji: { fontSize: 48 },
  resultTitle: { fontSize: 24, fontWeight: '800', marginTop: 8 },
  resultReason: { fontSize: 13, color: colors.textMuted, marginTop: 6, textAlign: 'center' },
  movesCard: { backgroundColor: colors.card, borderRadius: radii.lg, padding: 16, ...shadow },
  movesTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 8 },
  moveRow: { flexDirection: 'row', gap: 12, paddingVertical: 4 },
  moveNumber: { width: 28, color: colors.textMuted, fontWeight: '700' },
  moveText: { width: 70, color: colors.text },
  buttonRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 4 },
  primaryButton: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 22, borderRadius: radii.pill },
  primaryButtonText: { color: colors.white, fontWeight: '700' },
  secondaryButton: { backgroundColor: colors.border, paddingVertical: 12, paddingHorizontal: 22, borderRadius: radii.pill },
  secondaryButtonText: { color: colors.text, fontWeight: '700' },
});
