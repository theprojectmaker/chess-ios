import { Chess } from 'chess.js';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Board, BOARD_CHROME, type BoardMove } from '../components/Board';
import { Confetti } from '../components/Confetti';
import { TeacherBubble, TeacherFace } from '../components/TeacherBubble';
import { BoltIcon, BulbIcon, CheckIcon, CloseIcon, FlameIcon, HeartIcon, StarIcon } from '../components/Icons';
import { Piece } from '../components/Piece';
import { Body, ChunkyButton, Display, ProgressBar, Stat } from '../components/ui';
import { dailyPuzzle, getLesson } from '../lib/path';
import { newRating } from '../lib/elo';
import { nextRatedPuzzle, PUZZLES, successLine, THEME_INFO, type Puzzle } from '../lib/puzzles';
import { haptic, play, playMove } from '../lib/sound';
import { dayKey, DEFAULT_PROGRESS, earn, loadProgress, updateProgress } from '../lib/storage';
import { getTeacher, pickLine } from '../lib/teachers';
import { colors, MAX_CONTENT, themed } from '../lib/theme';

type Phase = 'solving' | 'reply' | 'wrong' | 'solved' | 'shown';
const HEARTS = 3;
const BLITZ_SECONDS = 180;
const parse = (u: string) => ({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });

// Easy themes first, so a Rush run starts gently and gets harder the longer you last.
const RUSH_ORDER = ['mate1', 'hanging', 'backRank', 'fork', 'promotion', 'pin', 'skewer', 'mate2', 'discovered', 'material', 'mate3'];
function buildRush(): Puzzle[] {
  const shuffled = [...PUZZLES].map((p) => ({ p, key: RUSH_ORDER.indexOf(p.theme) + Math.random() * 3.5 }));
  shuffled.sort((a, b) => a.key - b.key);
  return shuffled.map((s) => s.p);
}

export default function LessonScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; mode?: string }>();
  const blitz = params.mode === 'blitz';
  const rush = params.mode === 'rush' || blitz;
  const daily = params.mode === 'daily';
  const rated = params.mode === 'rated';
  const [myPuzzleRating, setMyPuzzleRating] = useState(0);
  const [ratingDelta, setRatingDelta] = useState<number | null>(null);
  const scored = useRef(false);
  const seen = useRef(new Set<string>());
  const [ratedList, setRatedList] = useState<Puzzle[]>([]);
  const lesson = params.id ? getLesson(params.id) : undefined;
  const fixedPuzzles = useMemo(() => (rush ? buildRush() : daily ? [dailyPuzzle(dayKey())] : lesson?.puzzles ?? []), [rush, daily, lesson]);
  const puzzles = rated ? ratedList : fixedPuzzles;
  const [teacherId, setTeacherId] = useState(DEFAULT_PROGRESS.teacher);
  const teacher = getTeacher(teacherId);
  const [line, setLine] = useState('');
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  useEffect(() => {
    loadProgress().then((p) => {
      setTeacherId(p.teacher);
      if (!rated) return;
      setMyPuzzleRating(p.puzzleRating);
      const first = nextRatedPuzzle(p.puzzleRating, seen.current);
      seen.current.add(first.id);
      setRatedList([first]);
      chess.current = new Chess(first.fen);
      setFen(first.fen);
      setLastMove(first.last);
    });
    // Runs once for this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [index, setIndex] = useState(0);
  const puzzle = puzzles[index];
  const chess = useRef(new Chess(puzzle?.fen));
  const [fen, setFen] = useState(puzzle?.fen ?? '');
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>('solving');
  const [lastMove, setLastMove] = useState<[string, string] | null>(puzzle?.last ?? null);
  const [badge, setBadge] = useState<{ square: string; kind: 'good' | 'bad' } | null>(null);
  const [hintSquare, setHintSquare] = useState<string | null>(null);
  const [arrow, setArrow] = useState<{ from: string; to: string; color: string } | null>(null);
  const [hearts, setHearts] = useState(HEARTS);
  const [clean, setClean] = useState(true);
  const [solvedCount, setSolvedCount] = useState(0);
  const [xp, setXp] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [ended, setEnded] = useState<'complete' | 'out' | null>(null);
  const started = useRef(Date.now());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));
  const pendingRevert = useRef<(() => void) | null>(null);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  // A wrong move stays visible briefly. Any button press must finish that undo first, or the
  // delayed undo lands on a later puzzle and leaves the board out of step with its solution.
  const settleWrongMove = () => pendingRevert.current?.();

  const [secondsLeft, setSecondsLeft] = useState(BLITZ_SECONDS);
  useEffect(() => {
    if (!blitz || ended) return;
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [blitz, ended]);
  const panel = useRef(new Animated.Value(0)).current;
  const panelOpen = phase === 'wrong' || phase === 'solved' || phase === 'shown';
  useEffect(() => {
    Animated.timing(panel, { toValue: panelOpen ? 1 : 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [panelOpen, panel]);

  if (rated && !puzzle && !ended) return <View style={styles.root} />;
  if (!puzzle && !ended) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <Display center>This lesson isn't available</Display>
        <ChunkyButton label="Go back" onPress={() => router.back()} style={{ marginTop: 16 }} />
      </View>
    );
  }

  const me = puzzle ? (puzzle.fen.split(' ')[1] as 'w' | 'b') : 'w';
  const info = puzzle ? THEME_INFO[puzzle.theme] : null;

  const finishSession = async (result: 'complete' | 'out', solved: number, earned: number, wrong: number) => {
    setEnded(result);
    const accuracy = Math.round((solved / Math.max(1, solved + wrong)) * 100);
    play(result === 'complete' ? 'win' : 'lose');
    haptic(result === 'complete' ? 'success' : 'medium');
    await updateProgress((p) => {
      const next = { ...earn(p, earned), puzzlesSolved: p.puzzlesSolved + solved, bestCombo: Math.max(p.bestCombo, bestCombo) };
      if (daily && result === 'complete' && solved > 0 && p.lastDaily !== dayKey()) {
        next.lastDaily = dayKey();
        next.dailySolved = p.dailySolved + 1;
      }
      if (blitz) next.blitzBest = Math.max(p.blitzBest, solved);
      else if (rush) next.rushBest = Math.max(p.rushBest, solved);
      if (lesson && result === 'complete') {
        next.lessonsDone = { ...p.lessonsDone, [lesson.id]: Math.max(p.lessonsDone[lesson.id] ?? 0, accuracy) };
      }
      return next;
    });
  };

  const scorePuzzle = (solved: boolean) => {
    if (!rated || scored.current) return;
    scored.current = true;
    const next = newRating(myPuzzleRating, puzzle.rating, solved ? 1 : 0, 30);
    setRatingDelta(next - myPuzzleRating);
    setMyPuzzleRating(next);
    updateProgress((p) => ({ ...p, puzzleRating: next, ratedPuzzles: p.ratedPuzzles + 1 }));
  };

  const loadPuzzle = (i: number, list: Puzzle[] = puzzles) => {
    const p = list[i];
    scored.current = false;
    setRatingDelta(null);
    timers.current.forEach(clearTimeout);
    timers.current = [];
    pendingRevert.current = null;
    chess.current = new Chess(p.fen);
    setIndex(i);
    setFen(p.fen);
    setStep(0);
    setPhase('solving');
    setLastMove(p.last);
    setBadge(null);
    setHintSquare(null);
    setArrow(null);
    setClean(true);
  };

  const advance = () => {
    const nextIndex = index + 1;
    if (hearts <= 0) {
      finishSession('out', solvedCount, xp, mistakes);
    } else if (rated) {
      const next = nextRatedPuzzle(myPuzzleRating, seen.current);
      seen.current.add(next.id);
      const list = [...ratedList, next];
      setRatedList(list);
      loadPuzzle(nextIndex, list);
    } else if (nextIndex >= puzzles.length) {
      finishSession('complete', solvedCount, xp, mistakes);
    } else {
      loadPuzzle(nextIndex);
    }
  };

  const onMove = (m: BoardMove) => {
    const expected = puzzle.line[step];
    const played = m.from + m.to + (m.promotion ?? '');
    const before = chess.current.fen();
    const made = chess.current.move({ from: m.from, to: m.to, promotion: m.promotion });
    setFen(chess.current.fen());
    setLastMove([m.from, m.to]);
    setHintSquare(null);

    if (played !== expected) {
      play('wrong');
      haptic('error');
      setBadge({ square: m.to, kind: 'bad' });
      setPhase('wrong');
      setClean(false);
      setMistakes((n) => n + 1);
      setHearts((h) => h - 1);
      setCombo(0);
      setLine(pickLine(teacher.wrong));
      scorePuzzle(false);
      const revert = () => {
        pendingRevert.current = null;
        chess.current = new Chess(before);
        setFen(before);
        setBadge(null);
        setLastMove(step === 0 ? puzzle.last : null);
      };
      pendingRevert.current = revert;
      later(() => {
        if (pendingRevert.current === revert) revert();
      }, 750);
      return;
    }

    playMove(made, chess.current.isCheck());
    haptic('light');
    setBadge({ square: m.to, kind: 'good' });
    if (step + 1 >= puzzle.line.length) {
      haptic('success');
      setPhase('solved');
      scorePuzzle(clean);
      const nextCombo = clean ? combo + 1 : 0;
      setCombo(nextCombo);
      setBestCombo((b) => Math.max(b, nextCombo));
      setTimeout(() => play(nextCombo >= 3 ? 'combo' : 'correct'), 140);
      setLine(pickLine(teacher.correct));
      const gain = (daily ? 20 : rush ? 5 : clean ? 10 : 5) + Math.min(nextCombo >= 2 ? nextCombo - 1 : 0, 5);
      setSolvedCount((n) => n + 1);
      setXp((x) => x + gain);
      return;
    }
    setPhase('reply');
    later(() => {
      const reply = chess.current.move(parse(puzzle.line[step + 1]));
      playMove(reply, chess.current.isCheck());
      setFen(chess.current.fen());
      setLastMove([reply.from, reply.to]);
      setBadge(null);
      setStep(step + 2);
      setPhase('solving');
    }, 520);
  };

  const showAnswer = () => {
    settleWrongMove();
    scorePuzzle(false);
    const m = parse(puzzle.line[step]);
    setArrow({ from: m.from, to: m.to, color: colors.leaf });
    setPhase('shown');
  };

  const useHint = () => {
    setHintSquare(parse(puzzle.line[step]).from);
    setClean(false);
    haptic('light');
  };

  const outOfHearts = hearts <= 0;
  if (blitz && secondsLeft === 0 && !ended) finishSession('out', solvedCount, xp, mistakes);
  const contentWidth = Math.min(width, MAX_CONTENT + 200);
  const boardSize = Math.floor(Math.max(240, Math.min(contentWidth - 12 - BOARD_CHROME, height - insets.top - insets.bottom - 350)));
  const translateY = panel.interpolate({ inputRange: [0, 1], outputRange: [260, 0] });

  if (ended) {
    const seconds = Math.round((Date.now() - started.current) / 1000);
    const accuracy = Math.round((solvedCount / Math.max(1, solvedCount + mistakes)) * 100);
    const win = ended === 'complete';
    const showParty = win || (rush && solvedCount > 0);
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }]}>
        {showParty && <Confetti />}
        <View style={styles.endInner}>
          <TeacherFace teacher={teacher} size={112} mood={showParty ? 'wow' : 'sad'} />
          <Display size={30} center>
            {rated ? `Puzzle rating ${myPuzzleRating}` : rush ? `${solvedCount} solved` : daily ? (win && solvedCount ? 'Daily puzzle solved' : 'Try again tomorrow') : win ? 'Lesson complete' : 'Out of hearts'}
          </Display>
          <Body size={16} center>
            {rated ? `${solvedCount} solved this run.` : blitz ? (secondsLeft === 0 ? 'Time is up!' : 'Run ended after three mistakes.') : rush ? 'Run ended after three mistakes.' : daily ? 'A new puzzle arrives tomorrow.' : win ? (bestCombo >= 3 ? `Best run: ${bestCombo} in a row.` : 'The next step on your path is open.') : 'Try this lesson again to move on.'}
          </Body>
          <View style={styles.endStats}>
            <Stat icon={<BoltIcon size={26} />} value={`+${xp}`} label="XP" tint={colors.sunWash} edge={colors.sun} />
            <Stat icon={<CheckIcon size={26} color={colors.leaf} />} value={`${accuracy}%`} label="Accuracy" tint={colors.leafWash} edge={colors.leaf} />
            <Stat icon={<Piece type="n" color="w" size={30} />} value={`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`} label="Time" tint={colors.skyWash} edge={colors.sky} />
          </View>
          <ChunkyButton style={{ alignSelf: 'stretch', marginTop: 8 }} label="Continue" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  const panelGood = phase === 'solved' || phase === 'shown';
  const wash = phase === 'solved' ? colors.leafWash : phase === 'shown' ? colors.skyWash : colors.coralWash;
  const accent = phase === 'solved' ? colors.leafLip : phase === 'shown' ? colors.skyLip : colors.coralLip;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Leave lesson" onPress={() => router.back()} hitSlop={10}>
            <CloseIcon size={28} />
          </Pressable>
          {rated ? (
            <View style={styles.rushScore} accessibilityLabel={`Puzzle rating ${myPuzzleRating}`}>
              <Display size={20} color={colors.ink}>{myPuzzleRating}</Display>
              {ratingDelta !== null && <Display size={16} color={ratingDelta >= 0 ? colors.leafLip : colors.coral}>{`  ${ratingDelta >= 0 ? '+' : ''}${ratingDelta}`}</Display>}
            </View>
          ) : rush ? (
            <View style={styles.rushScore}><BoltIcon size={24} /><Display size={22} color={colors.sunLip}>{solvedCount}</Display>{blitz && <Display size={18} color={secondsLeft <= 15 ? colors.coral : colors.muted}>{`  ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`}</Display>}</View>
          ) : (
            <ProgressBar value={(index + (phase === 'solved' ? 1 : 0)) / puzzles.length} />
          )}
          {combo >= 2 && (
            <View style={styles.combo} accessibilityLabel={`${combo} in a row`}>
              <FlameIcon size={20} />
              <Display size={16} color={colors.flame}>{combo}</Display>
            </View>
          )}
          <View style={styles.hearts}>
            {Array.from({ length: HEARTS }).map((_, i) => <HeartIcon key={i} size={24} muted={i >= hearts} />)}
          </View>
        </View>

        <View style={styles.prompt}>
          <View style={{ flex: 1 }}>
            <Display size={26}>{info!.prompt}</Display>
            <Body size={15}>{me === 'w' ? 'White' : 'Black'} to move{rated ? ` · Puzzle rated ${puzzle.rating}` : ''}</Body>
          </View>
          <Piece type="k" color={me} size={46} />
        </View>

        <View style={styles.boardArea}>
          <Board
            fen={fen}
            size={boardSize}
            orientation={me}
            movable={phase === 'solving' ? me : null}
            onMove={onMove}
            lastMove={lastMove}
            badge={badge}
            arrow={arrow}
            marks={hintSquare ? { [hintSquare]: 'rgba(88, 185, 46, 0.58)' } : undefined}
          />
        </View>

        <View style={styles.coach}>
          <TeacherBubble teacher={teacher} text={step > 0 ? 'Good. Now find the follow-up.' : info!.learn} />
        </View>

        {phase === 'solving' && (
          <View style={styles.hintWrap}>
            <ChunkyButton label={hintSquare ? 'Piece highlighted' : 'Hint'} outline small disabled={!!hintSquare} icon={<BulbIcon size={20} />} onPress={useHint} />
          </View>
        )}
      </View>

      <Animated.View
        pointerEvents={panelOpen ? 'auto' : 'none'}
        style={[styles.panel, { backgroundColor: wash, paddingBottom: Math.max(insets.bottom, 16) + 4, transform: [{ translateY }] }]}
      >
        {panelOpen && <View style={styles.panelInner}>
          <View style={styles.panelHead}>
            <View style={[styles.panelIcon, { backgroundColor: accent }]}>
              {panelGood ? <CheckIcon size={24} /> : <CloseIcon size={22} color="#FFFFFF" />}
            </View>
            <View style={{ flex: 1 }}>
              <Display size={22} color={accent}>
                {phase === 'solved' ? (clean ? 'Perfect' : 'Solved') : phase === 'shown' ? 'Here it is' : 'Not that move'}
              </Display>
              <Body size={15} color={accent}>
                {phase === 'solved'
                  ? `${successLine(puzzle)} ${line}${combo >= 2 ? ` ${combo} in a row!` : ''}`
                  : phase === 'shown'
                    ? 'The green arrow shows the move to play.'
                    : outOfHearts
                      ? rush ? 'That was your last heart.' : 'No hearts left for this lesson.'
                      : `${line} ${hearts} ${hearts === 1 ? 'heart' : 'hearts'} left.`}
              </Body>
            </View>
          </View>
          {phase === 'solved' && <ChunkyButton label="Continue" onPress={advance} />}
          {phase === 'shown' && <ChunkyButton label="Continue" color={colors.sky} lip={colors.skyLip} onPress={advance} />}
          {phase === 'wrong' && (outOfHearts ? (
            <ChunkyButton label="Finish" color={colors.coral} lip={colors.coralLip} onPress={advance} />
          ) : rush ? (
            <ChunkyButton label="Next puzzle" color={colors.coral} lip={colors.coralLip} onPress={advance} />
          ) : (
            <View style={styles.panelRow}>
              <ChunkyButton style={{ flex: 1 }} label="Show answer" outline onPress={showAnswer} />
              <ChunkyButton style={{ flex: 1 }} label="Try again" color={colors.coral} lip={colors.coralLip} onPress={() => { settleWrongMove(); setPhase('solving'); }} />
            </View>
          ))}
        </View>}
      </Animated.View>
    </View>
  );
}

const styles = themed(() => ({
  root: { flex: 1, backgroundColor: colors.page },
  center: { alignItems: 'center', justifyContent: 'center', padding: 20 },
  inner: { flex: 1, width: '100%', maxWidth: MAX_CONTENT + 200, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 12 },
  rushScore: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  hearts: { flexDirection: 'row', gap: 2 },
  prompt: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingBottom: 8 },
  boardArea: { alignItems: 'center' },
  hintWrap: { alignItems: 'center', marginTop: 8 },
  coach: { marginTop: 10, minHeight: 62, justifyContent: 'center', paddingHorizontal: 4 },
  combo: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  panel: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 16, paddingHorizontal: 18, alignItems: 'center', zIndex: 100 },
  panelInner: { width: '100%', maxWidth: MAX_CONTENT, gap: 12 },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  panelIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  panelRow: { flexDirection: 'row', gap: 10 },
  endInner: { width: '100%', maxWidth: 440, alignItems: 'center', gap: 10 },
  endStats: { flexDirection: 'row', gap: 10, marginTop: 10, alignSelf: 'stretch' },
}));
