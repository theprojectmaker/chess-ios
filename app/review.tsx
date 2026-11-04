import { Chess } from 'chess.js';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Board, BOARD_CHROME } from '../components/Board';
import { BackIcon, CloseIcon, ForwardIcon } from '../components/Icons';
import { Body, ChunkyButton, Display, ProgressBar } from '../components/ui';
import { getBot } from '../lib/bots';
import { MATE, type EngineMove } from '../lib/engine';
import { cancelThinking, think } from '../lib/engineClient';
import { getLastGame } from '../lib/gameStore';
import { colors, fonts, MAX_CONTENT } from '../lib/theme';

interface Analysed {
  white: number; // centipawns from White's side, capped so mates don't dominate the numbers
  best: EngineMove | null;
}
type Grade = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

const GRADES: Record<Grade, { label: string; color: string; wash: string }> = {
  best: { label: 'Best', color: colors.leaf, wash: colors.leafWash },
  good: { label: 'Good', color: colors.sky, wash: colors.skyWash },
  inaccuracy: { label: 'Inaccuracy', color: colors.sunLip, wash: colors.sunWash },
  mistake: { label: 'Mistake', color: colors.flame, wash: '#FFEEDD' },
  blunder: { label: 'Blunder', color: colors.coral, wash: colors.coralWash },
};

const winChance = (cp: number) => 100 / (1 + Math.exp(-cp / 170));

export default function ReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const game = useMemo(getLastGame, []);
  const [analysis, setAnalysis] = useState<Analysed[]>([]);
  const [ply, setPly] = useState(game ? game.san.length : 0);
  const listRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!game) return;
    let live = true;
    (async () => {
      const out: Analysed[] = [];
      for (let i = 0; i < game.fens.length && live; i++) {
        const fen = game.fens[i];
        const r = await think(fen, game.fens.slice(0, i), { maxDepth: 10, timeMs: 130 });
        const capped = Math.max(-1000, Math.min(1000, r.score === -MATE ? -1000 : r.score));
        out.push({ white: fen.split(' ')[1] === 'w' ? capped : -capped, best: r.best });
        if (live) setAnalysis([...out]);
      }
    })();
    return () => {
      live = false;
      cancelThinking();
    };
  }, [game]);

  const grades = useMemo(() => {
    const out: (Grade | null)[] = [];
    if (!game) return out;
    game.moves.forEach((m, i) => {
      const before = analysis[i];
      const after = analysis[i + 1];
      if (!before || !after) {
        out.push(null);
        return;
      }
      const sign = i % 2 === 0 ? 1 : -1;
      const loss = Math.max(0, (before.white - after.white) * sign);
      const isBest = before.best?.from === m.from && before.best?.to === m.to;
      out.push(isBest || loss <= 12 ? 'best' : loss <= 45 ? 'good' : loss <= 110 ? 'inaccuracy' : loss <= 260 ? 'mistake' : 'blunder');
    });
    return out;
  }, [analysis, game]);

  if (!game) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <Display center>No finished game to review</Display>
        <ChunkyButton style={{ marginTop: 16 }} label="Go back" onPress={() => router.back()} />
      </View>
    );
  }

  const bot = getBot(game.level);
  const myOffset = game.playerColor === 'w' ? 0 : 1;
  const myIndexes = game.moves.map((_, i) => i).filter((i) => i % 2 === myOffset);
  const graded = myIndexes.filter((i) => grades[i]);
  const counts: Record<Grade, number> = { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
  let accuracySum = 0;
  for (const i of graded) {
    counts[grades[i] as Grade]++;
    const sign = i % 2 === 0 ? 1 : -1;
    const drop = Math.max(0, winChance(analysis[i].white * sign) - winChance(analysis[i + 1].white * sign));
    accuracySum += Math.max(0, 103 * Math.exp(-0.043 * drop) - 3);
  }
  const accuracy = graded.length ? Math.round(accuracySum / graded.length) : null;
  const analysing = analysis.length < game.fens.length;

  const moveIndex = ply - 1;
  const grade = moveIndex >= 0 ? grades[moveIndex] : null;
  const move = moveIndex >= 0 ? game.moves[moveIndex] : null;
  const bestBefore = moveIndex >= 0 ? analysis[moveIndex]?.best : null;
  const showBest = !!grade && !!bestBefore && !['best', 'good'].includes(grade);
  const bestSan = showBest ? sanFor(game.fens[moveIndex], bestBefore!) : null;

  const boardSize = Math.floor(Math.max(220, Math.min(Math.min(width, MAX_CONTENT) - 12 - BOARD_CHROME, (height - insets.top - insets.bottom) * 0.5)));
  const resultWord = game.result === 'win' ? `You beat ${bot.name}` : game.result === 'draw' ? `Draw with ${bot.name}` : `${bot.name} won`;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close review" hitSlop={10} onPress={() => router.back()}>
            <CloseIcon size={28} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Display size={20}>{resultWord}</Display>
            <Body size={13}>{game.reason}</Body>
          </View>
          <View style={styles.accuracy}>
            <Display size={20} color={colors.leafLip}>{accuracy === null ? '--' : `${accuracy}%`}</Display>
            <Body size={11} bold>Accuracy</Body>
          </View>
        </View>

        {analysing ? (
          <View style={styles.progress}>
            <ProgressBar value={analysis.length / game.fens.length} color={colors.sky} height={12} />
            <Body size={12} bold style={{ marginLeft: 8 }}>Analysing</Body>
          </View>
        ) : (
          <View style={styles.counts}>
            {(Object.keys(GRADES) as Grade[]).map((g) => (
              <View key={g} style={[styles.count, { backgroundColor: GRADES[g].wash }]}>
                <Display size={16} color={GRADES[g].color}>{counts[g]}</Display>
                <Body size={10} bold color={GRADES[g].color} numberOfLines={1}>{GRADES[g].label}</Body>
              </View>
            ))}
          </View>
        )}

        <View style={styles.boardArea}>
          <Board
            fen={game.fens[ply]}
            size={boardSize}
            orientation={game.playerColor}
            lastMove={move ? [move.from, move.to] : null}
            arrow={showBest ? { from: bestBefore!.from, to: bestBefore!.to, color: colors.leaf } : null}
            badge={grade && move ? { square: move.to, kind: grade === 'best' || grade === 'good' ? 'good' : 'bad', color: GRADES[grade].color } : null}
          />
        </View>

        <View style={[styles.verdict, { backgroundColor: grade ? GRADES[grade].wash : colors.wash }]}>
          {moveIndex < 0 ? (
            <Body bold>Starting position</Body>
          ) : (
            <Body bold color={grade ? GRADES[grade].color : colors.muted}>
              {game.san[moveIndex]}{grade ? ` is ${grade === 'best' || grade === 'good' ? '' : grade === 'inaccuracy' ? 'an ' : 'a '}${GRADES[grade].label.toLowerCase()}` : ''}
              {bestSan ? `. Better: ${bestSan}` : ''}
            </Body>
          )}
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.moves} ref={listRef}>
          {game.san.map((san, i) => {
            const g = grades[i];
            const active = i === moveIndex;
            return (
              <Pressable key={i} accessibilityRole="button" accessibilityLabel={`Move ${Math.floor(i / 2) + 1}, ${san}`} onPress={() => setPly(i + 1)} style={[styles.move, active && { backgroundColor: colors.ink }]}>
                <Body size={13} bold color={active ? '#FFFFFF' : colors.muted}>{i % 2 === 0 ? `${i / 2 + 1}.` : ''}</Body>
                <Body size={14} bold color={active ? '#FFFFFF' : g && g !== 'best' && g !== 'good' ? GRADES[g].color : colors.ink}>{san}</Body>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={[styles.nav, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <ChunkyButton style={{ flex: 1 }} label="" a11yLabel="Previous move" outline icon={<BackIcon />} disabled={ply === 0} onPress={() => setPly(ply - 1)} />
          <ChunkyButton style={{ flex: 1 }} label="" a11yLabel="Next move" icon={<ForwardIcon color="#FFFFFF" />} disabled={ply >= game.san.length} onPress={() => setPly(ply + 1)} />
        </View>
      </View>
    </View>
  );
}

function sanFor(fen: string, m: EngineMove): string {
  try {
    return new Chess(fen).move({ from: m.from, to: m.to, promotion: m.promotion }).san;
  } catch {
    return m.from + m.to;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.page },
  center: { alignItems: 'center', justifyContent: 'center', padding: 20 },
  inner: { flex: 1, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 8 },
  accuracy: { alignItems: 'center' },
  progress: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 44 },
  counts: { flexDirection: 'row', gap: 4, paddingHorizontal: 10, height: 44 },
  count: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  boardArea: { alignItems: 'center', paddingVertical: 6 },
  verdict: { marginHorizontal: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  moves: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, padding: 10 },
  move: { flexDirection: 'row', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  nav: { flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingTop: 6 },
});
