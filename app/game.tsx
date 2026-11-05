import { Chess, type Move } from 'chess.js';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Board, BOARD_CHROME, type BoardMove } from '../components/Board';
import { BackIcon, BoltIcon, BulbIcon, FlagIcon, FlipIcon, StarIcon, UndoIcon } from '../components/Icons';
import { Confetti } from '../components/Confetti';
import { ActionButton, CapturedRow, capturedFrom, LabelDot } from '../components/gameParts';
import { TeacherBubble, type Mood } from '../components/TeacherBubble';
import { Piece } from '../components/Piece';
import { Body, ChunkyButton, Display, Sheet } from '../components/ui';
import { evaluatePosition, type PositionEval } from '../lib/analysis';
import { bookMove, inBook } from '../lib/book';
import { getBot } from '../lib/bots';
import { classify, explainWeakMove, LABELS, type Label } from '../lib/classify';
import { cancelThinking, think } from '../lib/engineClient';
import { setLastGame } from '../lib/gameStore';
import { haptic, play, playMove, type SoundName } from '../lib/sound';
import { clearSavedGame, DEFAULT_PROGRESS, earn, loadProgress, loadSavedGame, saveGame, updateProgress } from '../lib/storage';
import { getTeacher, pickLine } from '../lib/teachers';
import { colors, MAX_CONTENT } from '../lib/theme';

const HINTS = 3;
const COACH_MS = 220;
const LABEL_SOUND: Partial<Record<Label, SoundName>> = { brilliant: 'brilliant', great: 'great', blunder: 'blunder', mistake: 'wrong', miss: 'wrong', inaccuracy: 'inaccuracy' };

interface Feedback {
  label: Label;
  square: string;
  text: string;
  mood: Mood;
}

interface Result {
  kind: 'win' | 'loss' | 'draw';
  reason: string;
  xp: number;
  firstBeat: boolean;
}

export default function GameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ level?: string; color?: string; resume?: string }>();
  const level = Number(params.level ?? 1);
  const bot = getBot(level);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const chess = useRef(new Chess());
  const fens = useRef<string[]>([]);
  const token = useRef(0);
  const finished = useRef(false);
  const [fen, setFen] = useState(() => chess.current.fen());
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const [flipped, setFlipped] = useState(false);
  const [ready, setReady] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [hintsLeft, setHintsLeft] = useState(HINTS);
  const [hint, setHint] = useState<{ from: string; to: string } | null>(null);
  const [hintBusy, setHintBusy] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const moveStrip = useRef<ScrollView>(null);
  const [teacherId, setTeacherId] = useState(DEFAULT_PROGRESS.teacher);
  const [coachOn, setCoachOn] = useState(true);
  const [greeting, setGreeting] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [celebrate, setCelebrate] = useState(0);
  const teacher = getTeacher(teacherId);
  // The position the bot just moved from, kept so its move can be graded and a Miss detected.
  const botChoice = useRef<{ fen: string; evaluation: PositionEval; move?: { from: string; to: string; promotion?: string } } | null>(null);

  const lastMove = useMemo<[string, string] | null>(() => {
    const h = chess.current.history({ verbose: true });
    const last = h[h.length - 1];
    return last ? [last.from, last.to] : null;
  }, [fen]);
  const history = useMemo(() => chess.current.history(), [fen]);
  const { lost, diff } = useMemo(() => capturedFrom(fen), [fen]);

  const persist = useCallback((color: 'w' | 'b', hints: number) => {
    const moves = chess.current.history({ verbose: true }).map((m) => m.from + m.to + (m.promotion ?? ''));
    saveGame({ level, playerColor: color, moves, hintsLeft: hints });
  }, [level]);

  const finish = useCallback(async (kind: Result['kind'], reason: string, color: 'w' | 'b') => {
    if (finished.current) return;
    finished.current = true;
    token.current++;
    cancelThinking();
    setThinking(false);
    clearSavedGame();
    const xp = kind === 'win' ? 15 + level * 5 : kind === 'draw' ? 10 + level : 5;
    let firstBeat = false;
    await updateProgress((p) => {
      firstBeat = kind === 'win' && !p.botsBeaten[level];
      return {
        ...earn(p, xp),
        gamesPlayed: p.gamesPlayed + 1,
        gamesWon: p.gamesWon + (kind === 'win' ? 1 : 0),
        gamesDrawn: p.gamesDrawn + (kind === 'draw' ? 1 : 0),
        gamesLost: p.gamesLost + (kind === 'loss' ? 1 : 0),
        botsPlayed: { ...p.botsPlayed, [level]: true },
        botsBeaten: kind === 'win' ? { ...p.botsBeaten, [level]: true } : p.botsBeaten,
      };
    });
    const verbose = chess.current.history({ verbose: true });
    setLastGame({
      result: kind,
      reason,
      level,
      playerColor: color,
      fens: [...fens.current, chess.current.fen()],
      san: verbose.map((m) => m.san),
      moves: verbose.map((m) => ({ from: m.from, to: m.to })),
    });
    play(kind === 'win' ? 'win' : kind === 'loss' ? 'lose' : 'move');
    haptic(kind === 'win' ? 'success' : 'medium');
    setTimeout(() => setResult({ kind, reason, xp, firstBeat }), 650);
  }, [level]);

  const checkEnd = useCallback((color: 'w' | 'b') => {
    const c = chess.current;
    if (!c.isGameOver()) return false;
    if (c.isCheckmate()) finish(c.turn() === color ? 'loss' : 'win', 'by checkmate', color);
    else if (c.isStalemate()) finish('draw', 'by stalemate', color);
    else if (c.isThreefoldRepetition()) finish('draw', 'by repetition', color);
    else if (c.isInsufficientMaterial()) finish('draw', 'with too few pieces left to mate', color);
    else finish('draw', 'by the fifty-move rule', color);
    return true;
  }, [finish]);

  const applyMove = useCallback((move: BoardMove | string): Move | null => {
    const c = chess.current;
    const before = c.fen();
    let made: Move;
    try {
      made = c.move(move as never);
    } catch {
      return null;
    }
    fens.current.push(before);
    playMove(made, c.isCheck());
    setFen(c.fen());
    setHint(null);
    return made;
  }, []);

  const botTurn = useCallback((color: 'w' | 'b', hints: number) => {
    const my = ++token.current;
    setThinking(true);
    const begin = Date.now();
    const run = async () => {
      const c = chess.current;
      const book = bot.useBook ? bookMove(c.history()) : null;
      let move: BoardMove | string | null = book;
      if (!move) {
        const r = await think(c.fen(), fens.current, bot.think);
        move = r.move;
      }
      // A short pause keeps instant replies from feeling robotic, and lets the last move finish sliding.
      const wait = 420 - (Date.now() - begin);
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      if (my !== token.current || !move) return;
      const played = applyMove(move);
      if (played && botChoice.current) botChoice.current.move = { from: played.from, to: played.to, promotion: played.promotion };
      setThinking(false);
      persist(color, hints);
      checkEnd(color);
    };
    setTimeout(run, 200);
  }, [applyMove, bot, checkEnd, persist]);

  useEffect(() => {
    let live = true;
    (async () => {
      let color: 'w' | 'b' = 'w';
      let hints = HINTS;
      const progress = await loadProgress();
      if (!live) return;
      setTeacherId(progress.teacher);
      setCoachOn(progress.coachOn);
      setGreeting(pickLine(getTeacher(progress.teacher).hello));
      if (params.resume) {
        const saved = await loadSavedGame();
        if (!live) return;
        if (saved) {
          color = saved.playerColor;
          hints = saved.hintsLeft;
          for (const u of saved.moves) {
            fens.current.push(chess.current.fen());
            chess.current.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
          }
        }
      } else {
        const wanted = params.color ?? 'r';
        color = wanted === 'w' || wanted === 'b' ? wanted : Math.random() < 0.5 ? 'w' : 'b';
        clearSavedGame();
      }
      setPlayerColor(color);
      setHintsLeft(hints);
      setFen(chess.current.fen());
      setReady(true);
      play('start');
      if (!chess.current.isGameOver() && chess.current.turn() !== color) botTurn(color, hints);
    })();
    return () => {
      live = false;
      token.current++;
      cancelThinking();
    };
    // Runs once for this screen: the parameters never change while it is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gradeThenReply = async (before: string, prior: string[], moved: { from: string; to: string; promotion?: string }, lastTo: string | undefined) => {
    const my = ++token.current;
    setThinking(true);
    const c = chess.current;
    const after = c.fen();
    let label: Label = 'book';
    let text = '';
    if (inBook(c.history())) {
      botChoice.current = null;
      text = pickLine(teacher.say.book);
    } else {
      const A = await evaluatePosition(before, prior, COACH_MS);
      if (my !== token.current) return;
      const B = await evaluatePosition(after, [...prior, before], COACH_MS);
      if (my !== token.current) return;
      const choice = botChoice.current;
      const previous = choice?.move
        ? classify({ fen: choice.fen, move: choice.move, bestUci: choice.evaluation.bestUci, bestScore: choice.evaluation.score, secondScore: choice.evaluation.secondScore, afterScore: -A.score })
        : null;
      label = classify({ fen: before, move: moved, bestUci: A.bestUci, bestScore: A.score, secondScore: A.secondScore, afterScore: -B.score, previous }, lastTo);
      botChoice.current = { fen: after, evaluation: B };
      text = pickLine(teacher.say[label]);
      if (label === 'mistake' || label === 'blunder' || label === 'miss') {
        let better: string | null = null;
        try {
          better = A.bestUci ? new Chess(before).move({ from: A.bestUci.slice(0, 2), to: A.bestUci.slice(2, 4), promotion: A.bestUci[4] }).san : null;
        } catch {
          better = null;
        }
        text = explainWeakMove(after, B.bestUci, better);
      }
    }
    setFeedback({ label, square: moved.to, text, mood: label === 'brilliant' || label === 'great' ? 'wow' : ['mistake', 'blunder', 'miss'].includes(label) ? 'sad' : 'happy' });
    const sound = LABEL_SOUND[label];
    if (sound) play(sound);
    if (label === 'brilliant') {
      setCelebrate((n) => n + 1);
      haptic('success');
      updateProgress((p) => ({ ...earn(p, 10), brilliants: p.brilliants + 1 }));
    } else if (label === 'great') {
      haptic('success');
      updateProgress((p) => ({ ...earn(p, 3), greats: p.greats + 1 }));
    } else if (label === 'blunder') {
      haptic('error');
    }
    botTurn(playerColor, hintsLeft);
  };

  const onPlayerMove = (move: BoardMove) => {
    const before = chess.current.fen();
    const prior = [...fens.current];
    const previousMoves = chess.current.history({ verbose: true });
    const lastTo = previousMoves[previousMoves.length - 1]?.to;
    const made = applyMove(move);
    if (!made) return;
    haptic('light');
    persist(playerColor, hintsLeft);
    setFeedback(null);
    if (checkEnd(playerColor)) return;
    if (coachOn) gradeThenReply(before, prior, { from: made.from, to: made.to, promotion: made.promotion }, lastTo);
    else botTurn(playerColor, hintsLeft);
  };

  const canUndo = !result && !finished.current && chess.current.history().some((_, i) => (i % 2 === 0) === (playerColor === 'w'));
  const undo = () => {
    token.current++;
    cancelThinking();
    setThinking(false);
    const c = chess.current;
    if (c.turn() !== playerColor) {
      c.undo();
      fens.current.pop();
    } else {
      c.undo();
      c.undo();
      fens.current.pop();
      fens.current.pop();
    }
    setHint(null);
    setFeedback(null);
    botChoice.current = null;
    setFen(c.fen());
    persist(playerColor, hintsLeft);
  };

  const useHint = async () => {
    if (hintsLeft <= 0 || thinking || hintBusy || chess.current.turn() !== playerColor) return;
    setHintBusy(true);
    const r = await think(chess.current.fen(), fens.current, { maxDepth: 12, timeMs: 700 });
    setHintBusy(false);
    if (r.best) {
      setHint({ from: r.best.from, to: r.best.to });
      setHintsLeft(hintsLeft - 1);
      persist(playerColor, hintsLeft - 1);
    }
  };

  useEffect(() => {
    moveStrip.current?.scrollToEnd({ animated: true });
  }, [history.length]);

  const orientation: 'w' | 'b' = flipped ? (playerColor === 'w' ? 'b' : 'w') : playerColor;
  const contentWidth = Math.min(width, MAX_CONTENT + 200);
  const boardSize = Math.floor(Math.max(240, Math.min(contentWidth - 12 - BOARD_CHROME, height - insets.top - insets.bottom - (coachOn ? 372 : 310))));
  const botColor = playerColor === 'w' ? 'b' : 'w';
  // chess.current.turn() and the move list read directly from the board state on each render.
  const playersMove = ready && !thinking && !result && !finished.current && chess.current.turn() === playerColor;

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.inner}>
        <View style={styles.topNav}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to home" onPress={() => router.back()} hitSlop={10} style={styles.back}>
            <BackIcon size={26} />
          </Pressable>
          <Body size={13} bold color={colors.faint}>LEVEL {bot.level}</Body>
        </View>
        <View style={styles.middle}>
        <View style={styles.playerRow}>
          <View style={{ width: 44, height: 48, borderRadius: 22, backgroundColor: bot.lip }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: bot.color, alignItems: 'center', justifyContent: 'center' }}>
              <Piece type={bot.piece} color="w" size={34} />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Display size={18}>{bot.name}{thinking ? '  thinking' : ''}</Display>
            <CapturedRow pieces={playerColor === 'w' ? lost.w : lost.b} color={playerColor} advantage={playerColor === 'w' ? -diff : diff} />
          </View>
        </View>

        <View style={styles.boardArea}>
          <Board
            fen={fen}
            size={boardSize}
            orientation={orientation}
            movable={playersMove ? playerColor : null}
            onMove={onPlayerMove}
            lastMove={lastMove}
            arrow={hint}
            badge={feedback ? { square: feedback.square, kind: 'good', color: LABELS[feedback.label].color, text: LABELS[feedback.label].symbol } : null}
          />
        </View>

        <View style={styles.playerRow}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.wash, alignItems: 'center', justifyContent: 'center' }}>
            <Piece type="k" color={playerColor} size={36} />
          </View>
          <View style={{ flex: 1 }}>
            <Display size={18}>{playersMove ? 'Your move' : 'You'}</Display>
            <CapturedRow pieces={botColor === 'w' ? lost.w : lost.b} color={botColor} advantage={playerColor === 'w' ? diff : -diff} />
          </View>
        </View>

        {coachOn && (
          <View style={styles.coach}>
            <TeacherBubble
              teacher={teacher}
              mood={feedback?.mood}
              tint={feedback ? LABELS[feedback.label].wash : undefined}
              edge={feedback ? LABELS[feedback.label].color : undefined}
              text={feedback ? feedback.text : greeting}
              chip={feedback ? (
                <View style={styles.chip}>
                  <LabelDot label={feedback.label} size={18} />
                  <Body size={13} bold color={LABELS[feedback.label].color}>{LABELS[feedback.label].name}</Body>
                </View>
              ) : undefined}
            />
          </View>
        )}

        <ScrollView ref={moveStrip} horizontal showsHorizontalScrollIndicator={false} style={styles.strip} contentContainerStyle={styles.stripInner}>
          {history.length === 0 && <Body size={14} color={colors.faint}>Moves appear here</Body>}
          {history.map((san, i) => (
            <Body key={i} size={14} bold={i === history.length - 1} color={i === history.length - 1 ? colors.ink : colors.muted}>
              {i % 2 === 0 ? `${i / 2 + 1}. ` : ''}{san}
            </Body>
          ))}
        </ScrollView>
        </View>

        <View style={styles.actions}>
          <ActionButton label="Undo" icon={<UndoIcon />} onPress={undo} disabled={!canUndo} />
          <ActionButton label={`Hint ${hintsLeft}`} icon={<BulbIcon />} onPress={useHint} disabled={hintsLeft <= 0 || !playersMove || hintBusy} />
          <ActionButton label="Flip" icon={<FlipIcon />} onPress={() => setFlipped(!flipped)} />
          <ActionButton label="Resign" icon={<FlagIcon />} onPress={() => setConfirmResign(true)} disabled={!!result || finished.current} />
        </View>
      </View>

      {celebrate > 0 && <Confetti key={celebrate} />}

      <Sheet visible={confirmResign} onClose={() => setConfirmResign(false)}>
        <Display size={22}>Resign this game?</Display>
        <Body size={16}>{bot.name} gets the win. You can still review the game afterwards.</Body>
        <ChunkyButton
          label="Resign"
          color={colors.coral}
          lip={colors.coralLip}
          onPress={() => {
            setConfirmResign(false);
            finish('loss', 'by resignation', playerColor);
          }}
        />
        <ChunkyButton label="Keep playing" outline onPress={() => setConfirmResign(false)} />
      </Sheet>

      <Sheet visible={!!result} canDismiss={false}>
        {result && (
          <>
            {result.kind === 'win' && <Confetti />}
            <View style={styles.resultHead}>
              <View style={[styles.resultIcon, { backgroundColor: result.kind === 'win' ? colors.sunWash : result.kind === 'draw' ? colors.skyWash : colors.wash }]}>
                {result.kind === 'win' ? <StarIcon size={46} /> : <Piece type="k" color={result.kind === 'draw' ? 'w' : 'b'} size={54} />}
              </View>
              <Display size={28} center>
                {result.kind === 'win' ? `You beat ${bot.name}` : result.kind === 'draw' ? 'Draw' : `${bot.name} wins`}
              </Display>
              <Body size={16} center>{result.kind === 'draw' ? `Drawn ${result.reason}` : `Won ${result.reason}`}</Body>
              <View style={styles.xpRow}>
                <BoltIcon size={24} />
                <Display size={20} color={colors.sunLip}>+{result.xp} XP</Display>
              </View>
            </View>
            <ChunkyButton label="Review game" color={colors.sky} lip={colors.skyLip} onPress={() => router.replace('/review')} />
            <View style={styles.resultRow}>
              <ChunkyButton style={{ flex: 1 }} label="Rematch" outline onPress={() => router.replace({ pathname: '/game', params: { level: String(level), color: playerColor === 'w' ? 'b' : 'w', rematch: String(Date.now()) } })} />
              <ChunkyButton style={{ flex: 1 }} label="Home" outline onPress={() => router.back()} />
            </View>
          </>
        )}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.page, alignItems: 'center' },
  inner: { flex: 1, width: '100%', maxWidth: MAX_CONTENT + 200, paddingHorizontal: 6 },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingVertical: 6 },
  topNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 6 },
  middle: { flex: 1, justifyContent: 'center' },
  coach: { minHeight: 66, justifyContent: 'center', paddingBottom: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  back: { padding: 2 },
  boardArea: { alignItems: 'center', justifyContent: 'center', paddingVertical: 2 },
  strip: { flexGrow: 0, marginHorizontal: 8 },
  stripInner: { gap: 10, alignItems: 'center', height: 26 },
  actions: { flexDirection: 'row', gap: 8, paddingHorizontal: 8, paddingTop: 6 },
  resultHead: { alignItems: 'center', gap: 6 },
  resultIcon: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  resultRow: { flexDirection: 'row', gap: 10 },
});
