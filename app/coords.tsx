import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Board, BOARD_CHROME } from '../components/Board';
import { Confetti } from '../components/Confetti';
import { BoltIcon, CloseIcon } from '../components/Icons';
import { TeacherFace } from '../components/TeacherBubble';
import { Body, ChunkyButton, Display, ProgressBar } from '../components/ui';
import { haptic, play } from '../lib/sound';
import { DEFAULT_PROGRESS, earn, loadProgress, updateProgress } from '../lib/storage';
import { getTeacher } from '../lib/teachers';
import { colors, MAX_CONTENT, themed } from '../lib/theme';
import { STANDARD_FEN } from '../lib/variants';

const SECONDS = 30;
const randomSquare = () => 'abcdefgh'[Math.floor(Math.random() * 8)] + String(1 + Math.floor(Math.random() * 8));

export default function CoordsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [teacherId, setTeacherId] = useState(DEFAULT_PROGRESS.teacher);
  const [best, setBest] = useState(0);
  const [state, setState] = useState<'ready' | 'run' | 'done'>('ready');
  const [orientation, setOrientation] = useState<'w' | 'b'>('w');
  const [target, setTarget] = useState('e4');
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(SECONDS);
  const [flash, setFlash] = useState<{ square: string; good: boolean } | null>(null);
  const [newBest, setNewBest] = useState(false);
  const scoreRef = useRef(0);
  const teacher = getTeacher(teacherId);

  useEffect(() => {
    loadProgress().then((p) => {
      setTeacherId(p.teacher);
      setBest(p.sprintBest);
    });
  }, []);

  useEffect(() => {
    if (state !== 'run') return;
    const started = Date.now();
    const timer = setInterval(() => {
      const remaining = SECONDS - Math.floor((Date.now() - started) / 1000);
      setLeft(Math.max(0, remaining));
      if (remaining > 0) return;
      clearInterval(timer);
      setState('done');
      const final = scoreRef.current;
      play(final > 0 ? 'win' : 'lose');
      setNewBest(final > best);
      updateProgress((p) => ({ ...earn(p, Math.min(final, 40)), sprintBest: Math.max(p.sprintBest, final) }));
    }, 200);
    return () => clearInterval(timer);
  }, [state, best]);

  const start = (side: 'w' | 'b') => {
    setOrientation(side);
    scoreRef.current = 0;
    setScore(0);
    setLeft(SECONDS);
    setTarget(randomSquare());
    setFlash(null);
    play('start');
    setState('run');
  };

  const tap = (square: string) => {
    if (state !== 'run') return;
    if (square === target) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      setFlash({ square, good: true });
      play('move');
      haptic('light');
      let next = randomSquare();
      while (next === target) next = randomSquare();
      setTarget(next);
    } else {
      setFlash({ square, good: false });
      play('inaccuracy');
      haptic('error');
    }
  };

  if (state !== 'run') {
    const done = state === 'done';
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 14) }]}>
        {done && score > 0 && <Confetti />}
        <View style={styles.ready}>
          <TeacherFace teacher={teacher} size={100} mood={done && newBest ? 'wow' : 'happy'} />
          <Display size={30} center>{done ? `${score} squares` : 'Square Sprint'}</Display>
          <Body size={16} center>{done ? (newBest ? 'A new best score!' : `Your best is ${best}.`) : `A square is named. Tap it, as many as you can in ${SECONDS} seconds. Your best: ${best}.`}</Body>
          {done && <View style={styles.xp}><BoltIcon size={24} /><Display size={20} color={colors.sunLip}>+{Math.min(score, 40)} XP</Display></View>}
          <ChunkyButton style={styles.full} label="Play from White's side" onPress={() => start('w')} />
          <ChunkyButton style={styles.full} label="Play from Black's side" color={colors.solid} lip={colors.solidLip} onPress={() => start('b')} />
          <ChunkyButton style={styles.full} label="Back" outline onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  const boardSize = Math.floor(Math.max(240, Math.min(Math.min(width, MAX_CONTENT + 200) - 12 - BOARD_CHROME, height - insets.top - insets.bottom - 230)));
  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 14) }]}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Leave" onPress={() => router.back()} hitSlop={10}><CloseIcon size={28} /></Pressable>
          <ProgressBar value={left / SECONDS} color={left <= 5 ? colors.coral : colors.sky} />
          <Display size={20}>{left}s</Display>
        </View>
        <View style={styles.targetRow}>
          <Display size={72} color={colors.ink} center>{target}</Display>
          <Body bold size={15}>{score} found</Body>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Board
            fen={STANDARD_FEN}
            size={boardSize}
            orientation={orientation}
            hideCoords
            onSquareTap={tap}
            marks={flash ? { [flash.square]: flash.good ? 'rgba(88, 185, 46, 0.58)' : 'rgba(255, 92, 92, 0.6)' } : undefined}
          />
        </View>
      </View>
    </View>
  );
}

const styles = themed(() => ({
  root: { flex: 1, backgroundColor: colors.page },
  center: { alignItems: 'center', justifyContent: 'center', padding: 20 },
  ready: { width: '100%', maxWidth: 440, alignItems: 'center', gap: 10 },
  full: { alignSelf: 'stretch' },
  xp: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  inner: { flex: 1, width: '100%', maxWidth: MAX_CONTENT + 200, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 12 },
  targetRow: { alignItems: 'center', paddingBottom: 10 },
}));
