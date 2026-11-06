import { Chess } from 'chess.js';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Board, BOARD_CHROME, type BoardMove } from '../components/Board';
import { Confetti } from '../components/Confetti';
import { EvalBar, EvalChart } from '../components/EvalChart';
import { LabelDot } from '../components/gameParts';
import { BackIcon, CloseIcon, ForwardIcon } from '../components/Icons';
import { MoveBurst } from '../components/MoveBurst';
import { TeacherBubble, type Mood } from '../components/TeacherBubble';
import { Body, ChunkyButton, Display, ProgressBar } from '../components/ui';
import { evaluatePosition, type PositionEval } from '../lib/analysis';
import { inBook } from '../lib/book';
import { getBot } from '../lib/bots';
import { classify, expectedPoints, LABEL_ORDER, LABELS, type Label } from '../lib/classify';
import { coachLine } from '../lib/coaching';
import { START_RATING } from '../lib/elo';
import { cancelThinking } from '../lib/engineClient';
import { getGame, saveAnalysis, type FinishedGame } from '../lib/gameStore';
import { haptic, play, playMove } from '../lib/sound';
import { DEFAULT_PROGRESS, earn, loadProgress, updateProgress } from '../lib/storage';
import { openingName } from '../lib/openings';
import { getTeacher, pickLine } from '../lib/teachers';
import { colors, MAX_CONTENT, themed, labelWash } from '../lib/theme';

const WEAK: Label[] = ['inaccuracy', 'mistake', 'miss', 'blunder'];
const LABEL_PHRASE: Record<Label, string> = { brilliant: 'brilliant', great: 'a great move', best: 'the best move', excellent: 'excellent', good: 'good', book: 'a book move', inaccuracy: 'an inaccuracy', mistake: 'a mistake', miss: 'a miss', blunder: 'a blunder' };
const RETRY: Label[] = ['mistake', 'miss', 'blunder'];
const uciOf = (m: { from: string; to: string; promotion?: string }) => m.from + m.to + (m.promotion ?? '');

function sanFor(fen: string, uci: string): string {
  try {
    return new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san;
  } catch {
    return uci;
  }
}

function accuracyOf(game: FinishedGame, evals: PositionEval[], indexes: number[]): number | null {
  const done = indexes.filter((i) => evals[i] && evals[i + 1]);
  if (!done.length) return null;
  let sum = 0;
  for (const i of done) {
    const drop = Math.max(0, expectedPoints(evals[i].score) - expectedPoints(-evals[i + 1].score)) * 100;
    sum += Math.max(0, 103 * Math.exp(-0.043 * drop) - 3);
  }
  return Math.round(sum / done.length);
}

export default function ReviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [game, setGame] = useState<FinishedGame | null | undefined>(undefined);
  const [evals, setEvals] = useState<PositionEval[]>([]);
  const [view, setView] = useState<'report' | 'walk' | 'retry'>('report');
  const [ply, setPly] = useState(0);
  const [teacherId, setTeacherId] = useState(DEFAULT_PROGRESS.teacher);
  const [myRating, setMyRating] = useState(START_RATING);
  const teacher = getTeacher(teacherId);

  const [retryAt, setRetryAt] = useState(0);
  const [retryState, setRetryState] = useState<'try' | 'right' | 'wrong' | 'shown' | 'checking'>('try');
  const [retryFen, setRetryFen] = useState('');
  const [retryWins, setRetryWins] = useState(0);
  const [burstKey, setBurstKey] = useState(0);
  const [party, setParty] = useState(0);

  useEffect(() => {
    let live = true;
    loadProgress().then((p) => {
      setTeacherId(p.teacher);
      setMyRating(p.rating);
    });
    getGame(id).then(async (g) => {
      if (!live) return;
      setGame(g);
      if (!g) return;
      if (g.evals && g.evals.length === g.fens.length) {
        setEvals(g.evals);
        return;
      }
      const out: PositionEval[] = [];
      for (let i = 0; i < g.fens.length && live; i++) {
        out.push(await evaluatePosition(g.fens[i], g.fens.slice(0, i), 140));
        if (live) setEvals([...out]);
      }
      if (live) {
        const offset = g.playerColor === 'w' ? 0 : 1;
        saveAnalysis(g.id, out, accuracyOf(g, out, g.moves.map((_, i) => i).filter((i) => g.twoPlayer || i % 2 === offset)));
      }
    });
    return () => {
      live = false;
      cancelThinking();
    };
  }, [id]);

  const labels = useMemo(() => {
    const out: (Label | null)[] = [];
    if (!game) return out;
    const standard = !game.startFen;
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
            isBook: standard && inBook(game.san.slice(0, i + 1)),
            previous: i > 0 ? out[i - 1] : null,
            rating: game.twoPlayer ? undefined : i % 2 === (game.playerColor === 'w' ? 0 : 1) ? myRating : getBot(game.level).elo,
          },
          i > 0 ? game.moves[i - 1].to : undefined,
        ),
      );
    });
    return out;
  }, [evals, game, myRating]);

  if (game === undefined) return <View style={styles.root} />;
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
  const all = game.moves.map((_, i) => i);
  const mine = all.filter((i) => game.twoPlayer || i % 2 === offset);
  const white = all.filter((i) => i % 2 === 0);
  const black = all.filter((i) => i % 2 === 1);
  const count = (indexes: number[], l: Label) => indexes.filter((i) => labels[i] === l).length;
  const analysing = evals.length < game.fens.length;
  const whiteEvals = evals.map((e, i) => (game.fens[i].split(' ')[1] === 'w' ? e.score : -e.score));
  const myAccuracy = accuracyOf(game, evals, mine);
  const retryList = mine.filter((i) => labels[i] && RETRY.includes(labels[i] as Label));
  const nextWeakAfter = (p: number) => mine.find((i) => i + 1 > p && labels[i] && WEAK.includes(labels[i] as Label));

  const resultWord = game.twoPlayer
    ? game.result === 'win' ? 'White won' : game.result === 'loss' ? 'Black won' : 'Draw'
    : game.result === 'win' ? `You beat ${bot.name}` : game.result === 'draw' ? `Draw with ${bot.name}` : `${bot.name} won`;

  const sharePgn = () => {
    const c = new Chess(game.fens[0]);
    const bot2 = getBot(game.level);
    c.setHeader('Event', 'Chess Buddy');
    c.setHeader('Date', new Date(game.date).toISOString().slice(0, 10).replace(/-/g, '.'));
    c.setHeader('White', game.twoPlayer ? 'White' : game.playerColor === 'w' ? 'You' : bot2.name);
    c.setHeader('Black', game.twoPlayer ? 'Black' : game.playerColor === 'b' ? 'You' : bot2.name);
    const whiteWon = game.twoPlayer ? game.result === 'win' : (game.result === 'win') === (game.playerColor === 'w');
    c.setHeader('Result', game.result === 'draw' ? '1/2-1/2' : whiteWon ? '1-0' : '0-1');
    game.moves.forEach((m) => c.move(m));
    Share.share({ message: c.pgn() }).catch(() => {});
  };

  const closeBtn = (
    <Pressable accessibilityRole="button" accessibilityLabel="Close review" hitSlop={10} onPress={() => (view === 'report' ? router.back() : setView('report'))}>
      {view === 'report' ? <CloseIcon size={28} /> : <BackIcon size={28} />}
    </Pressable>
  );

  if (view === 'report') {
    const summary = analysing
      ? 'Give me a moment, I am going through your game.'
      : myAccuracy === null ? 'A short one. Play a longer game and I will have more to say.'
      : myAccuracy >= 85 ? `Wonderful control: ${myAccuracy}% accuracy. Let us look at your best moments.`
      : myAccuracy >= 65 ? `Solid, ${myAccuracy}% accuracy. A couple of moves decided this one.`
      : `You will improve fast from this one. I found ${retryList.length} ${retryList.length === 1 ? 'move' : 'moves'} worth a second try.`;
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={[styles.report, { paddingBottom: Math.max(insets.bottom, 14) + 8 }]}>
          <View style={styles.header}>
            {closeBtn}
            <View style={{ flex: 1 }}>
              <Display size={22}>{resultWord}</Display>
              <Body size={13}>{[game.title, game.reason].filter(Boolean).join(' · ')}</Body>
              {!game.startFen && openingName(game.san) && <Body size={13} bold numberOfLines={1}>{openingName(game.san)}</Body>}
            </View>
          </View>
          <TeacherBubble teacher={teacher} text={summary} mood={myAccuracy !== null && myAccuracy >= 65 ? 'wow' : 'happy'} />
          {analysing ? (
            <View style={styles.progress}>
              <ProgressBar value={evals.length / game.fens.length} color={colors.sky} height={14} />
              <Body size={12} bold style={{ marginLeft: 8 }}>Analysing</Body>
            </View>
          ) : (
            <>
              <View style={styles.accuracyRow}>
                {[{ name: 'White', list: white }, { name: 'Black', list: black }].map((side) => (
                  <View key={side.name} style={styles.accuracyCard}>
                    <Display size={30} color={colors.ink}>{accuracyOf(game, evals, side.list) ?? '--'}{accuracyOf(game, evals, side.list) === null ? '' : '%'}</Display>
                    <Body size={12} bold>{side.name} accuracy</Body>
                  </View>
                ))}
              </View>
              <EvalChart whiteEvals={whiteEvals} labels={labels} ply={ply} onPick={(p) => { setPly(p); setView('walk'); }} />
              <View style={styles.table}>
                <View style={styles.tableRow}>
                  <Body size={12} bold style={styles.cell}>White</Body>
                  <View style={{ flex: 1 }} />
                  <Body size={12} bold style={styles.cell}>Black</Body>
                </View>
                {LABEL_ORDER.map((l) => (
                  <View key={l} style={styles.tableRow}>
                    <Display size={17} style={styles.cell}>{count(white, l)}</Display>
                    <View style={styles.tableMid}>
                      <LabelDot label={l} size={24} />
                      <Body bold size={14} color={colors.ink}>{LABELS[l].name}</Body>
                    </View>
                    <Display size={17} style={styles.cell}>{count(black, l)}</Display>
                  </View>
                ))}
              </View>
              <ChunkyButton label="Start review" color={colors.sky} lip={colors.skyLip} onPress={() => { setPly(0); setView('walk'); }} />
              {retryList.length > 0 && (
                <ChunkyButton
                  label={`Retry your mistakes (${retryList.length})`}
                  onPress={() => {
                    setRetryAt(0);
                    setRetryWins(0);
                    setRetryState('try');
                    setRetryFen(game.fens[retryList[0]]);
                    setPly(retryList[0]);
                    setView('retry');
                  }}
                />
              )}
              <View style={styles.reportRow}>
                <ChunkyButton style={{ flex: 1 }} small outline label="Analysis board" onPress={() => router.push({ pathname: '/analysis', params: { fen: game.fens[game.fens.length - 1] } })} />
                <ChunkyButton style={{ flex: 1 }} small outline label="Share PGN" onPress={sharePgn} />
              </View>
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  const boardSize = Math.floor(Math.max(200, Math.min(Math.min(width, MAX_CONTENT) - 30 - BOARD_CHROME, (height - insets.top - insets.bottom) * 0.46)));
  const fullBoard = boardSize + BOARD_CHROME - 6;

  if (view === 'retry') {
    const i = retryList[retryAt];
    const label = labels[i] as Label;
    const best = evals[i].bestUci;
    const movable = retryState === 'try' || retryState === 'wrong';
    const say =
      retryState === 'right' ? pickLine(teacher.correct)
      : retryState === 'checking' ? 'Let me check that.'
      : retryState === 'wrong' ? `${pickLine(teacher.wrong)} Try once more.`
      : retryState === 'shown' ? `${best ? sanFor(game.fens[i], best) : 'That'} was the move here.`
      : `You played ${game.san[i]} here (${LABELS[label].name}). Can you find better?`;
    const onRetryMove = async (m: BoardMove) => {
      const uci = uciOf(m);
      const c = new Chess(game.fens[i]);
      const made = c.move({ from: m.from, to: m.to, promotion: m.promotion });
      playMove(made, c.isCheck());
      setRetryFen(c.fen());
      setRetryState('checking');
      const after = await evaluatePosition(c.fen(), game.fens.slice(0, i + 1), 260);
      const right = uci === best || (uci !== uciOf(game.moves[i]) && expectedPoints(evals[i].score) - expectedPoints(-after.score) <= 0.05);
      if (right) {
        play('great');
        haptic('success');
        setRetryState('right');
        setRetryWins((n) => n + 1);
        setBurstKey((k) => k + 1);
        setParty((n) => n + 1);
      } else {
        play('wrong');
        haptic('error');
        setRetryFen(game.fens[i]);
        setRetryState('wrong');
      }
    };
    const advance = () => {
      const next = retryAt + 1;
      if (next < retryList.length) {
        setRetryAt(next);
        setRetryFen(game.fens[retryList[next]]);
        setRetryState('try');
        return;
      }
      const wins = retryWins;
      if (wins > 0) updateProgress((p) => earn(p, wins * 5));
      if (wins === retryList.length) play('win');
      setView('report');
    };
    return (
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 12) }]}>
        {party > 0 && <Confetti key={party} count={22} />}
        <View style={styles.inner}>
          <View style={styles.header}>
            {closeBtn}
            <ProgressBar value={(retryAt + (retryState === 'right' || retryState === 'shown' ? 1 : 0)) / retryList.length} />
            <Display size={18} color={colors.leafLip}>{retryWins}/{retryList.length}</Display>
          </View>
          <View style={styles.middle}>
            <View style={{ alignItems: 'center' }}>
              <Board
                fen={retryFen}
                size={boardSize}
                orientation={game.twoPlayer ? (i % 2 === 0 ? 'w' : 'b') : game.playerColor}
                movable={movable ? (i % 2 === 0 ? 'w' : 'b') : null}
                onMove={onRetryMove}
                arrow={retryState === 'shown' && best ? { from: best.slice(0, 2), to: best.slice(2, 4), color: colors.leaf } : null}
              />
              {retryState === 'right' && <MoveBurst key={burstKey} label="great" boardSize={fullBoard} />}
            </View>
            <View style={{ marginTop: 12, minHeight: 72, justifyContent: 'center' }}>
              <TeacherBubble
                teacher={teacher}
                text={say}
                mood={retryState === 'right' ? 'wow' : retryState === 'wrong' ? 'sad' : 'happy'}
                tint={retryState === 'right' ? colors.leafWash : retryState === 'wrong' ? colors.coralWash : undefined}
                edge={retryState === 'right' ? colors.leaf : retryState === 'wrong' ? colors.coral : undefined}
              />
            </View>
          </View>
          <View style={styles.nav}>
            {retryState === 'right' || retryState === 'shown' ? (
              <ChunkyButton style={{ flex: 1 }} label={retryAt + 1 < retryList.length ? 'Next mistake' : 'Finish'} onPress={advance} />
            ) : (
              <ChunkyButton style={{ flex: 1 }} label="Show me" outline disabled={retryState === 'checking'} onPress={() => { setRetryFen(game.fens[i]); setRetryState('shown'); }} />
            )}
          </View>
        </View>
      </View>
    );
  }

  const index = ply - 1;
  const label = index >= 0 ? labels[index] : null;
  const move = index >= 0 ? game.moves[index] : null;
  const best = index >= 0 ? evals[index]?.bestUci ?? null : null;
  const weak = !!label && WEAK.includes(label);
  const betterSan = weak && best ? sanFor(game.fens[index], best) : null;
  const reason = weak && label ? coachLine({ rating: myRating, teacher, label, fenAfter: game.fens[ply], replyUci: evals[ply]?.bestUci ?? null, betterSan, scoreBefore: evals[index]?.score, scoreAfter: evals[ply] ? -evals[ply].score : undefined }) : null;
  const voice = label ? teacher.say[label][index % teacher.say[label].length] : null;
  const mood: Mood = label === 'brilliant' || label === 'great' ? 'wow' : weak ? 'sad' : 'happy';
  const nextWeak = nextWeakAfter(ply);

  const go = (p: number) => {
    setPly(p);
    const l = p > 0 ? labels[p - 1] : null;
    if (p > 0) {
      const c = new Chess(game.fens[p - 1]);
      const made = c.move(game.moves[p - 1]);
      if (l === 'brilliant') play('brilliant');
      else if (l === 'great') play('great');
      else if (l === 'blunder') play('blunder');
      else playMove(made, c.isCheck());
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.inner}>
        <View style={styles.header}>
          {closeBtn}
          <View style={{ flex: 1 }}><EvalChart whiteEvals={whiteEvals} labels={labels} ply={ply} onPick={go} height={40} /></View>
        </View>

        <View style={styles.boardRow}>
          <EvalBar whiteCp={whiteEvals[ply] ?? 0} height={fullBoard} flipped={game.playerColor === 'b'} />
          <View>
            <Board
              fen={game.fens[ply]}
              size={boardSize}
              orientation={game.playerColor}
              lastMove={move ? [move.from, move.to] : null}
              marks={label && move ? { [move.from]: `${LABELS[label].color}66`, [move.to]: `${LABELS[label].color}99` } : undefined}
              arrow={weak && best ? { from: best.slice(0, 2), to: best.slice(2, 4), color: colors.leaf } : null}
              badge={label && move ? { square: move.to, kind: 'good', color: LABELS[label].color, text: LABELS[label].symbol } : null}
            />
            {label && <MoveBurst key={ply} label={label} boardSize={fullBoard} />}
          </View>
        </View>

        <View style={styles.bubble}>
          {index < 0 ? (
            <TeacherBubble teacher={teacher} text="Step through with the arrows, or tap any move below." />
          ) : (
            <TeacherBubble
              teacher={teacher}
              mood={mood}
              tint={label ? labelWash(LABELS[label]) : undefined}
              edge={label ? LABELS[label].color : undefined}
              text={label ? `${game.san[index]} is ${LABEL_PHRASE[label]} ${LABELS[label].symbol}. ${reason ?? voice}` : game.san[index]}
            />
          )}
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.moves}>
          {game.san.map((san, i) => {
            const l = labels[i];
            const active = i === index;
            return (
              <Pressable key={i} accessibilityRole="button" accessibilityLabel={`Move ${Math.floor(i / 2) + 1}, ${san}${l ? `, ${LABELS[l].name}` : ''}`} onPress={() => go(i + 1)} style={[styles.move, active && { backgroundColor: colors.solid }]}>
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
          <ChunkyButton style={{ flex: 1.2 }} label="Analyze" small outline onPress={() => router.push({ pathname: '/analysis', params: { fen: game.fens[ply] } })} />
          <ChunkyButton style={{ flex: 1.2 }} label="Slip" a11yLabel="Next slip" small outline disabled={nextWeak === undefined} onPress={() => nextWeak !== undefined && go(nextWeak + 1)} />
          <ChunkyButton style={{ flex: 1 }} label="" a11yLabel="Next move" icon={<ForwardIcon color="#FFFFFF" />} disabled={ply >= game.san.length} onPress={() => go(ply + 1)} />
        </View>
      </View>
    </View>
  );
}

const styles = themed(() => ({
  root: { flex: 1, backgroundColor: colors.page },
  center: { alignItems: 'center', justifyContent: 'center', padding: 20 },
  inner: { flex: 1, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' },
  report: { padding: 12, gap: 12, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, paddingVertical: 6 },
  middle: { flex: 1, justifyContent: 'center' },
  progress: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20 },
  accuracyRow: { flexDirection: 'row', gap: 10 },
  accuracyCard: { flex: 1, alignItems: 'center', paddingVertical: 10, borderWidth: 2, borderBottomWidth: 5, borderColor: colors.line, borderRadius: 16 },
  table: { borderWidth: 2, borderBottomWidth: 5, borderColor: colors.line, borderRadius: 16, paddingVertical: 8, paddingHorizontal: 12, gap: 4 },
  tableRow: { flexDirection: 'row', alignItems: 'center' },
  tableMid: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 18 },
  cell: { width: 52, textAlign: 'center' },
  boardRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 4, paddingVertical: 2 },
  bubble: { minHeight: 66, justifyContent: 'center', paddingHorizontal: 2 },
  moves: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, paddingHorizontal: 10, paddingVertical: 4 },
  move: { flexDirection: 'row', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  reportRow: { flexDirection: 'row', gap: 10 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 4 },
}));
