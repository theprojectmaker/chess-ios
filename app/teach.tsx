import { Chess } from 'chess.js';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Board, BOARD_CHROME, type BoardMove } from '../components/Board';
import { Confetti } from '../components/Confetti';
import { BoltIcon, CloseIcon } from '../components/Icons';
import { TeacherBubble, TeacherFace } from '../components/TeacherBubble';
import { Body, ChunkyButton, Display, ProgressBar } from '../components/ui';
import { haptic, play, playMove } from '../lib/sound';
import { DEFAULT_PROGRESS, earn, loadProgress, updateProgress } from '../lib/storage';
import { getTeacher, pickLine } from '../lib/teachers';
import { getTeaching } from '../lib/teachings';
import { colors, MAX_CONTENT } from '../lib/theme';

const XP = 15;
const REPEAT_XP = 5;

export default function TeachScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lesson = useMemo(() => getTeaching(id ?? ''), [id]);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [teacherId, setTeacherId] = useState(DEFAULT_PROGRESS.teacher);
  const [index, setIndex] = useState(0);
  const [fen, setFen] = useState(lesson?.steps[0].fen ?? '');
  const [lastMove, setLastMove] = useState<[string, string] | null>(null);
  const [state, setState] = useState<'ask' | 'done' | 'nudge'>('ask');
  const [nudge, setNudge] = useState('');
  const [finished, setFinished] = useState(false);
  const [earned, setEarned] = useState(XP);
  const teacher = getTeacher(teacherId);

  useEffect(() => {
    loadProgress().then((p) => setTeacherId(p.teacher));
  }, []);

  if (!lesson) {
    return (
      <View style={[styles.root, styles.center]}>
        <Display center>This lesson isn't available</Display>
        <ChunkyButton style={{ marginTop: 16 }} label="Go back" onPress={() => router.back()} />
      </View>
    );
  }

  const step = lesson.steps[index];
  const needsMove = !!step.moves;
  const canContinue = !needsMove || state === 'done';

  const onMove = (m: BoardMove) => {
    const uci = m.from + m.to + (m.promotion ?? '');
    if (!step.moves!.includes(uci)) {
      play('wrong');
      haptic('error');
      setNudge(pickLine(teacher.wrong));
      setState('nudge');
      return;
    }
    const c = new Chess(fen);
    const made = c.move({ from: m.from, to: m.to, promotion: m.promotion });
    playMove(made, c.isCheck());
    setTimeout(() => play('correct'), 180);
    haptic('success');
    setFen(c.fen());
    setLastMove([m.from, m.to]);
    setState('done');
  };

  const next = async () => {
    if (index + 1 < lesson.steps.length) {
      const n = lesson.steps[index + 1];
      setIndex(index + 1);
      setFen(n.fen);
      setLastMove(null);
      setState('ask');
      return;
    }
    play('win');
    setFinished(true);
    await updateProgress((p) => {
      const gain = p.lessonsDone[lesson.id] === undefined ? XP : REPEAT_XP;
      setEarned(gain);
      return { ...earn(p, gain), lessonsDone: { ...p.lessonsDone, [lesson.id]: 100 } };
    });
  };

  if (finished) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <Confetti />
        <TeacherFace teacher={teacher} size={110} mood="wow" />
        <Display size={30} center style={{ marginTop: 16 }}>{lesson.title}: done</Display>
        <View style={styles.xp}><BoltIcon size={26} /><Display size={22} color={colors.sunLip}>+{earned} XP</Display></View>
        <ChunkyButton style={{ alignSelf: 'stretch', marginTop: 20 }} label="Continue" onPress={() => router.back()} />
      </View>
    );
  }

  const boardSize = Math.floor(Math.max(240, Math.min(Math.min(width, MAX_CONTENT + 200) - 12 - BOARD_CHROME, height - insets.top - insets.bottom - 310)));
  const bubble = state === 'done' ? step.done ?? pickLine(teacher.correct) : state === 'nudge' ? `${nudge} ${step.say}` : step.say;

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 14) }]}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Leave lesson" onPress={() => router.back()} hitSlop={10}>
            <CloseIcon size={28} />
          </Pressable>
          <ProgressBar value={(index + (canContinue && needsMove ? 1 : 0)) / lesson.steps.length} color={colors.sun} />
        </View>
        <Body bold size={13} color={colors.faint} style={{ paddingHorizontal: 18 }}>{lesson.title.toUpperCase()}</Body>
        <View style={styles.middle}>
          <Board fen={fen} size={boardSize} orientation={step.fen.split(' ')[1] as 'w' | 'b'} movable={needsMove && state !== 'done' ? (step.fen.split(' ')[1] as 'w' | 'b') : null} onMove={onMove} lastMove={lastMove} />
          <View style={{ marginTop: 12, minHeight: 84, justifyContent: 'center' }}>
            <TeacherBubble teacher={teacher} text={bubble} mood={state === 'done' ? 'wow' : state === 'nudge' ? 'sad' : 'happy'} tint={state === 'done' ? colors.leafWash : state === 'nudge' ? colors.coralWash : undefined} edge={state === 'done' ? colors.leaf : state === 'nudge' ? colors.coral : undefined} />
          </View>
        </View>
        <View style={styles.footer}>
          <ChunkyButton label={index + 1 < lesson.steps.length ? 'Next' : 'Finish'} disabled={!canContinue} color={colors.leaf} onPress={next} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.page },
  center: { alignItems: 'center', justifyContent: 'center', padding: 22 },
  inner: { flex: 1, width: '100%', maxWidth: MAX_CONTENT + 200, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 12 },
  middle: { flex: 1, justifyContent: 'center' },
  footer: { paddingHorizontal: 16 },
  xp: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
});
