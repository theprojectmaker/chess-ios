import { Chess } from 'chess.js';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Board, BOARD_CHROME } from '../components/Board';
import { BackIcon, CloseIcon, ForwardIcon } from '../components/Icons';
import { TeacherBubble, type Mood } from '../components/TeacherBubble';
import { LabelDot } from '../components/gameParts';
import { Body, ChunkyButton, Display, ProgressBar } from '../components/ui';
import { evaluatePosition, type PositionEval } from '../lib/analysis';
import { inBook } from '../lib/book';
import { getBot } from '../lib/bots';
import { classify, expectedPoints, explainWeakMove, LABEL_ORDER, LABELS, type Label } from '../lib/classify';
import { cancelThinking } from '../lib/engineClient';
import { getLastGame } from '../lib/gameStore';
import { DEFAULT_PROGRESS, loadProgress } from '../lib/storage';
import { getTeacher } from '../lib/teachers';
import { colors, MAX_CONTENT } from '../lib/theme';

const WEAK: Label[] = ['inaccuracy', 'mistake', 'miss', 'blunder'];

function sanFor(fen: string, uci: string): string {
  try {
    return new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san;
  } catch {
    return uci;
  }
}

export default function ReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const game = useMemo(getLastGame, []);
  const [evals, setEvals] = useState<PositionEval[]>([]);
  const [ply, setPly] = useState(game ? game.san.length : 0);
  const [teacherId, setTeacherId] = useState(DEFAULT_PROGRESS.teacher);
  const teacher = getTeacher(teacherId);

  useEffect(() => {
    loadProgress().then((p) => setTeacherId(p.teacher));
    if (!game) return;
    let live = true;
    (async () => {
      const out: PositionEval[] = [];
      for (let i = 0; i < game.fens.length && live; i++) {
        out.push(await evaluatePosition(game.fens[i], game.fens.slice(0, i), 140));
        if (live) setEvals([...out]);
      }
    })();
    return () => {
      live = false;
      cancelThinking();
    };
  }, [game]);

  const labels = useMemo(() => {
    const out: (Label | null)[] = [];
    if (!game) return out;
    game.moves.forEach((m, i) => {
      const before = evals[i];
      const after = evals[i + 1];
      if (!before || !after) {
        out.push(null);
        return;
      }
      out.push(
        classify(
          {
            fen: game.fens[i],
            move: m,
            bestUci: before.bestUci,
            bestScore: before.score,
            secondScore: before.secondScore,
            afterScore: -after.score,
            isBook: inBook(game.san.slice(0, i + 1)),
            previous: i > 0 ? out[i - 1] : null,
          },
          i > 0 ? game.moves[i - 1].to : undefined,
        ),
      );
    });
    return out;
  }, [evals, game]);

  if (!game) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <Display center>No finished game to review</Display>
        <ChunkyButton style={{ marginTop: 16 }} label="Go back" onPress={() => router.back()} />
      </View>
    );
  }

  const bot = getBot(game.level);
  const offset = game.playerColor === 'w' ? 0 : 1;
  const mine = game.moves.map((_, i) => i).filter((i) => game.twoPlayer || i % 2 === offset);
  const graded = mine.filter((i) => labels[i]);
  const counts = {} as Record<Label, number>;
  LABEL_ORDER.forEach((l) => (counts[l] = 0));
  let accuracySum = 0;
  for (const i of graded) {
    counts[labels[i] as Label]++;
    const drop = Math.max(0, expectedPoints(evals[i].score) - expectedPoints(-evals[i + 1].score)) * 100;
    accuracySum += Math.max(0, 103 * Math.exp(-0.043 * drop) - 3);
  }
  const accuracy = graded.length ? Math.round(accuracySum / graded.length) : null;
  const analysing = evals.length < game.fens.length;

  const index = ply - 1;
  const label = index >= 0 ? labels[index] : null;
  const move = index >= 0 ? game.moves[index] : null;
  const best = index >= 0 ? evals[index]?.bestUci ?? null : null;
  const weak = !!label && WEAK.includes(label);
  const betterSan = weak && best ? sanFor(game.fens[index], best) : null;
  const reason = weak ? explainWeakMove(game.fens[ply], evals[ply]?.bestUci ?? null, betterSan) : null;
  const voice = label ? teacher.say[label][index % teacher.say[label].length] : null;
  const mood: Mood = label === 'brilliant' || label === 'great' ? 'wow' : weak ? 'sad' : 'happy';

  const boardSize = Math.floor(Math.max(200, Math.min(Math.min(width, MAX_CONTENT) - 12 - BOARD_CHROME, (height - insets.top - insets.bottom) * 0.44)));
  const resultWord = game.twoPlayer
    ? game.result === 'win' ? 'White won' : game.result === 'loss' ? 'Black won' : 'Draw'
    : game.result === 'win' ? `You beat ${bot.name}` : game.result === 'draw' ? `Draw with ${bot.name}` : `${bot.name} won`;

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
            <ProgressBar value={evals.length / game.fens.length} color={colors.sky} height={12} />
            <Body size={12} bold style={{ marginLeft: 8 }}>Analysing</Body>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.countsRow} contentContainerStyle={styles.counts}>
            {LABEL_ORDER.filter((l) => counts[l] > 0).map((l) => (
              <View key={l} style={[styles.count, { backgroundColor: LABELS[l].wash }]}>
                <LabelDot label={l} size={22} />
                <Display size={16} color={LABELS[l].color}>{counts[l]}</Display>
                <Body size={12} bold color={LABELS[l].color}>{LABELS[l].name}</Body>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.boardArea}>
          <Board
            fen={game.fens[ply]}
            size={boardSize}
            orientation={game.playerColor}
            lastMove={move ? [move.from, move.to] : null}
            arrow={weak && best ? { from: best.slice(0, 2), to: best.slice(2, 4), color: colors.leaf } : null}
            badge={label && move ? { square: move.to, kind: 'good', color: LABELS[label].color, text: LABELS[label].symbol } : null}
          />
        </View>

        <View style={styles.bubble}>
          {index < 0 ? (
            <TeacherBubble teacher={teacher} text="Tap a move below to step through the game." />
          ) : (
            <TeacherBubble
              teacher={teacher}
              mood={mood}
              tint={label ? LABELS[label].wash : undefined}
              edge={label ? LABELS[label].color : undefined}
              text={label ? `${game.san[index]} is ${LABELS[label].name.toLowerCase()} ${LABELS[label].symbol}. ${reason ?? voice}` : game.san[index]}
            />
          )}
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.moves}>
          {game.san.map((san, i) => {
            const l = labels[i];
            const active = i === index;
            return (
              <Pressable key={i} accessibilityRole="button" accessibilityLabel={`Move ${Math.floor(i / 2) + 1}, ${san}${l ? `, ${LABELS[l].name}` : ''}`} onPress={() => setPly(i + 1)} style={[styles.move, active && { backgroundColor: colors.ink }]}>
                <Body size={13} bold color={active ? '#FFFFFF' : colors.muted}>{i % 2 === 0 ? `${i / 2 + 1}.` : ''}</Body>
                <Body size={14} bold color={active ? '#FFFFFF' : l && l !== 'best' && l !== 'excellent' && l !== 'good' ? LABELS[l].color : colors.ink}>
                  {san}{l && ['brilliant', 'great', 'inaccuracy', 'mistake', 'blunder'].includes(l) ? LABELS[l].symbol : ''}
                </Body>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.page },
  center: { alignItems: 'center', justifyContent: 'center', padding: 20 },
  inner: { flex: 1, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 6 },
  accuracy: { alignItems: 'center' },
  progress: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 38 },
  countsRow: { flexGrow: 0, height: 38 },
  counts: { gap: 6, paddingHorizontal: 10, alignItems: 'center' },
  count: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, height: 34, borderRadius: 10 },
  boardArea: { alignItems: 'center', paddingVertical: 5 },
  bubble: { minHeight: 66, justifyContent: 'center', paddingHorizontal: 2 },
  moves: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, paddingHorizontal: 10, paddingVertical: 4 },
  move: { flexDirection: 'row', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  nav: { flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingTop: 4 },
});
