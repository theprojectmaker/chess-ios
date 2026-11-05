import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackIcon } from '../components/Icons';
import { Piece } from '../components/Piece';
import { Body, Card, ChunkyButton, Display } from '../components/ui';
import { getBot } from '../lib/bots';
import { loadGames, type StoredGame } from '../lib/gameStore';
import { colors, MAX_CONTENT } from '../lib/theme';

function describe(g: StoredGame) {
  const bot = getBot(g.level);
  if (g.twoPlayer) return { title: g.result === 'win' ? 'White won' : g.result === 'loss' ? 'Black won' : 'Draw', tone: colors.sky };
  if (g.result === 'win') return { title: `You beat ${bot.name}`, tone: colors.leafLip };
  if (g.result === 'draw') return { title: `Draw with ${bot.name}`, tone: colors.sky };
  return { title: `${bot.name} won`, tone: colors.coral };
}

export default function GamesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [games, setGames] = useState<StoredGame[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadGames().then(setGames);
    }, []),
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={10}><BackIcon size={28} /></Pressable>
        <Display size={24}>Review your games</Display>
      </View>
      <ScrollView contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        {games && games.length === 0 && (
          <View style={styles.empty}>
            <Piece type="k" color="w" size={84} />
            <Display size={20} center>No games yet</Display>
            <Body center>Finish a game and it shows up here, ready to review with your teacher.</Body>
            <ChunkyButton style={{ alignSelf: 'stretch', marginTop: 8 }} label="Back to Play" onPress={() => router.back()} />
          </View>
        )}
        {games?.map((g) => {
          const d = describe(g);
          return (
            <Card key={g.id} style={styles.row} onPress={() => router.push({ pathname: '/review', params: { id: g.id } })}>
              <Piece type="k" color={g.twoPlayer ? 'w' : g.playerColor} size={44} />
              <View style={{ flex: 1 }}>
                <Display size={17} color={d.tone}>{d.title}</Display>
                <Body size={13}>
                  {[g.title, g.reason, `${Math.ceil(g.uci.length / 2)} moves`, new Date(g.date).toLocaleDateString()].filter(Boolean).join(' · ')}
                </Body>
              </View>
              <View style={styles.acc}>
                <Display size={18}>{g.accuracy !== undefined ? `${g.accuracy}%` : 'New'}</Display>
                <Body size={11} bold>{g.accuracy !== undefined ? 'Accuracy' : 'Not reviewed'}</Body>
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.page },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' },
  list: { padding: 14, gap: 10, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  acc: { alignItems: 'center', minWidth: 62 },
  empty: { alignItems: 'center', gap: 6, paddingTop: 50, paddingHorizontal: 16 },
});
