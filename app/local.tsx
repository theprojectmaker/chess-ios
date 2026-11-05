import { Chess, type Move } from 'chess.js';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Board, BOARD_CHROME, type BoardMove } from '../components/Board';
import { ActionButton, CapturedRow, capturedFrom } from '../components/gameParts';
import { BackIcon, FlagIcon, FlipIcon, StarIcon, UndoIcon } from '../components/Icons';
import { Piece } from '../components/Piece';
import { Body, ChunkyButton, Display, Sheet } from '../components/ui';
import { setLastGame } from '../lib/gameStore';
import { haptic, play, playMove } from '../lib/sound';
import { clearLocalGame, loadLocalGame, saveLocalGame } from '../lib/storage';
import { colors, MAX_CONTENT } from '../lib/theme';

interface Outcome {
  winner: 'w' | 'b' | null;
  reason: string;
}
const NAME = { w: 'White', b: 'Black' };

export default function LocalGameScreen() {
  const router = useRouter();
  const { resume } = useLocalSearchParams<{ resume?: string }>();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const chess = useRef(new Chess());
  const fens = useRef<string[]>([]);
  const strip = useRef<ScrollView>(null);
  const [fen, setFen] = useState(() => chess.current.fen());
  const [autoFlip, setAutoFlip] = useState(true);
  const [orientation, setOrientation] = useState<'w' | 'b'>('w');
  const [confirm, setConfirm] = useState<'resign' | 'draw' | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const flipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const turn = fen.split(' ')[1] as 'w' | 'b';
  const history = useMemo(() => chess.current.history(), [fen]);
  const lastMove = useMemo<[string, string] | null>(() => {
    const h = chess.current.history({ verbose: true });
    const last = h[h.length - 1];
    return last ? [last.from, last.to] : null;
    // The move list changes exactly when the position does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen]);
  const { lost, diff } = useMemo(() => capturedFrom(fen), [fen]);

  useEffect(() => {
    if (resume) {
      loadLocalGame().then((saved) => {
        if (!saved) return;
        for (const u of saved.moves) {
          fens.current.push(chess.current.fen());
          chess.current.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
        }
        setAutoFlip(saved.autoFlip);
        if (saved.autoFlip) setOrientation(chess.current.turn());
        setFen(chess.current.fen());
      });
    } else {
      clearLocalGame();
    }
    return () => {
      if (flipTimer.current) clearTimeout(flipTimer.current);
    };
    // Runs once for this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    strip.current?.scrollToEnd({ animated: true });
  }, [history.length]);

  const persist = (flip: boolean) => {
    const moves = chess.current.history({ verbose: true }).map((m) => m.from + m.to + (m.promotion ?? ''));
    if (moves.length) saveLocalGame({ moves, autoFlip: flip });
    else clearLocalGame();
  };

  const end = (result: Outcome) => {
    clearLocalGame();
    if (flipTimer.current) clearTimeout(flipTimer.current);
    const verbose = chess.current.history({ verbose: true });
    setLastGame({
      twoPlayer: true,
      result: result.winner === 'w' ? 'win' : result.winner === 'b' ? 'loss' : 'draw',
      reason: result.reason,
      level: 0,
      playerColor: 'w',
      fens: [...fens.current, chess.current.fen()],
      san: verbose.map((m) => m.san),
      moves: verbose.map((m) => ({ from: m.from, to: m.to })),
    });
    play(result.winner ? 'win' : 'move');
    haptic('success');
    setTimeout(() => setOutcome(result), 500);
  };

  const onMove = (m: BoardMove) => {
    const c = chess.current;
    const before = c.fen();
    let made: Move;
    try {
      made = c.move({ from: m.from, to: m.to, promotion: m.promotion });
    } catch {
      return;
    }
    fens.current.push(before);
    playMove(made, c.isCheck());
    haptic('light');
    setFen(c.fen());
    persist(autoFlip);
    if (c.isCheckmate()) end({ winner: made.color, reason: 'by checkmate' });
    else if (c.isStalemate()) end({ winner: null, reason: 'by stalemate' });
    else if (c.isThreefoldRepetition()) end({ winner: null, reason: 'by repetition' });
    else if (c.isInsufficientMaterial()) end({ winner: null, reason: 'with too few pieces left to mate' });
    else if (c.isDraw()) end({ winner: null, reason: 'by the fifty-move rule' });
    else if (autoFlip) flipTimer.current = setTimeout(() => setOrientation(c.turn()), 550);
  };

  const undo = () => {
    if (flipTimer.current) clearTimeout(flipTimer.current);
    const c = chess.current;
    c.undo();
    fens.current.pop();
    setFen(c.fen());
    if (autoFlip) setOrientation(c.turn());
    persist(autoFlip);
  };

  const toggleFlip = () => {
    const next = !autoFlip;
    setAutoFlip(next);
    setOrientation(next ? chess.current.turn() : 'w');
    persist(next);
  };

  const newGame = () => {
    chess.current = new Chess();
    fens.current = [];
    clearLocalGame();
    setOutcome(null);
    setOrientation('w');
    setFen(chess.current.fen());
  };

  const top: 'w' | 'b' = orientation === 'w' ? 'b' : 'w';
  const contentWidth = Math.min(width, MAX_CONTENT + 200);
  const boardSize = Math.floor(Math.max(240, Math.min(contentWidth - 12 - BOARD_CHROME, height - insets.top - insets.bottom - 310)));
  const over = !!outcome || chess.current.isGameOver();

  const playerRow = (color: 'w' | 'b') => {
    const opponent = color === 'w' ? 'b' : 'w';
    const edge = color === 'w' ? diff : -diff;
    const active = turn === color && !over;
    return (
      <View style={styles.playerRow}>
        <View style={[styles.avatar, active && { borderColor: colors.leaf, backgroundColor: colors.leafWash }]}>
          <Piece type="k" color={color} size={36} />
        </View>
        <View style={{ flex: 1 }}>
          <Display size={18}>{active ? `${NAME[color]} to move` : NAME[color]}</Display>
          <CapturedRow pieces={lost[opponent]} color={opponent} advantage={edge} />
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.inner}>
        <View style={styles.topNav}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to home" onPress={() => router.back()} hitSlop={10}>
            <BackIcon size={26} />
          </Pressable>
          <Body size={13} bold color={colors.faint}>PASS AND PLAY</Body>
        </View>
        <View style={styles.middle}>
          {playerRow(top)}
          <View style={styles.boardArea}>
            <Board fen={fen} size={boardSize} orientation={orientation} movable={over ? null : turn} onMove={onMove} lastMove={lastMove} />
          </View>
          {playerRow(orientation)}
          <ScrollView ref={strip} horizontal showsHorizontalScrollIndicator={false} style={styles.strip} contentContainerStyle={styles.stripInner}>
            {history.length === 0 && <Body size={14} color={colors.faint}>Moves appear here</Body>}
            {history.map((san, i) => (
              <Body key={i} size={14} bold={i === history.length - 1} color={i === history.length - 1 ? colors.ink : colors.muted}>
                {i % 2 === 0 ? `${i / 2 + 1}. ` : ''}{san}
              </Body>
            ))}
          </ScrollView>
        </View>
        <View style={styles.actions}>
          <ActionButton label="Undo" icon={<UndoIcon />} onPress={undo} disabled={history.length === 0 || over} />
          <ActionButton label={autoFlip ? 'Auto flip on' : 'Auto flip off'} active={autoFlip} icon={<FlipIcon color={autoFlip ? colors.sky : colors.muted} />} onPress={toggleFlip} />
          <ActionButton label="Draw" icon={<Piece type="p" color="w" size={24} />} onPress={() => setConfirm('draw')} disabled={over} />
          <ActionButton label="Resign" icon={<FlagIcon />} onPress={() => setConfirm('resign')} disabled={over} />
        </View>
      </View>

      <Sheet visible={!!confirm} onClose={() => setConfirm(null)}>
        <Display size={22}>{confirm === 'draw' ? 'Agree to a draw?' : `${NAME[turn]} resigns?`}</Display>
        <Body size={16}>{confirm === 'draw' ? 'Both players should agree before ending the game.' : `${NAME[turn === 'w' ? 'b' : 'w']} gets the win.`}</Body>
        <ChunkyButton
          label={confirm === 'draw' ? 'Agree to draw' : 'Resign'}
          color={confirm === 'draw' ? colors.sky : colors.coral}
          lip={confirm === 'draw' ? colors.skyLip : colors.coralLip}
          onPress={() => {
            const kind = confirm;
            setConfirm(null);
            if (kind === 'draw') end({ winner: null, reason: 'by agreement' });
            else end({ winner: turn === 'w' ? 'b' : 'w', reason: 'by resignation' });
          }}
        />
        <ChunkyButton label="Keep playing" outline onPress={() => setConfirm(null)} />
      </Sheet>

      <Sheet visible={!!outcome} canDismiss={false}>
        {outcome && (
          <>
            <View style={styles.resultHead}>
              <View style={[styles.resultIcon, { backgroundColor: outcome.winner ? colors.sunWash : colors.skyWash }]}>
                {outcome.winner ? <Piece type="k" color={outcome.winner} size={56} /> : <StarIcon size={46} muted />}
              </View>
              <Display size={28} center>{outcome.winner ? `${NAME[outcome.winner]} wins` : 'Draw'}</Display>
              <Body size={16} center>{outcome.winner ? `Won ${outcome.reason}` : `Drawn ${outcome.reason}`}</Body>
            </View>
            <ChunkyButton label="Review game" color={colors.sky} lip={colors.skyLip} onPress={() => router.replace('/review')} />
            <View style={styles.resultRow}>
              <ChunkyButton style={{ flex: 1 }} label="New game" outline onPress={newGame} />
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
  topNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 6 },
  middle: { flex: 1, justifyContent: 'center' },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingVertical: 6 },
  avatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.wash, alignItems: 'center', justifyContent: 'center' },
  boardArea: { alignItems: 'center', paddingVertical: 2 },
  strip: { flexGrow: 0, marginHorizontal: 8 },
  stripInner: { gap: 10, alignItems: 'center', height: 26 },
  actions: { flexDirection: 'row', gap: 8, paddingHorizontal: 8, paddingTop: 6 },
  resultHead: { alignItems: 'center', gap: 6 },
  resultIcon: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  resultRow: { flexDirection: 'row', gap: 10 },
});
