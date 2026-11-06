import { Chess } from 'chess.js';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Board, BOARD_CHROME, type BoardMove } from '../components/Board';
import { EvalBar } from '../components/EvalChart';
import { ActionButton } from '../components/gameParts';
import { BackIcon, FlipIcon, UndoIcon } from '../components/Icons';
import { Body, Display } from '../components/ui';
import { MATE, mateIn } from '../lib/engine';
import { cancelThinking, think } from '../lib/engineClient';
import { openingName } from '../lib/openings';
import { playMove } from '../lib/sound';
import { colors, MAX_CONTENT, shape, themed } from '../lib/theme';
import { STANDARD_FEN } from '../lib/variants';

interface Line {
  san: string;
  label: string;
  uci: { from: string; to: string };
}

const describe = (score: number, whiteToMove: boolean) => {
  const mate = mateIn(score);
  if (mate !== null) return `${(mate > 0) === whiteToMove ? '' : '-'}M${Math.abs(mate)}`;
  const white = whiteToMove ? score : -score;
  return `${white >= 0 ? '+' : ''}${(white / 100).toFixed(1)}`;
};

export default function AnalysisScreen() {
  const router = useRouter();
  const { fen: startParam } = useLocalSearchParams<{ fen?: string }>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const start = useMemo(() => {
    try {
      return new Chess(startParam ?? STANDARD_FEN).fen();
    } catch {
      return STANDARD_FEN;
    }
  }, [startParam]);
  const chess = useRef(new Chess(start));
  const fens = useRef<string[]>([]);
  const [fen, setFen] = useState(start);
  const [flipped, setFlipped] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [whiteCp, setWhiteCp] = useState(0);
  const [depth, setDepth] = useState(0);
  const [lastMove, setLastMove] = useState<[string, string] | null>(null);

  useEffect(() => {
    let live = true;
    setLines([]);
    (async () => {
      const whiteToMove = fen.split(' ')[1] === 'w';
      const r = await think(fen, fens.current, { maxDepth: 16, timeMs: 900, blunderMargin: 100000 });
      if (!live) return;
      setDepth(r.depth);
      if (!r.best) {
        setWhiteCp(r.score === -MATE ? (whiteToMove ? -1000 : 1000) : 0);
        return;
      }
      setWhiteCp(Math.max(-1000, Math.min(1000, whiteToMove ? r.score : -r.score)));
      const c = new Chess(fen);
      setLines(r.lines.slice(0, 3).map((l) => ({
        san: c.moves({ verbose: true }).find((m) => m.from === l.from && m.to === l.to && (m.promotion ?? '') === (l.promotion ?? ''))?.san ?? l.from + l.to,
        label: describe(l.score, whiteToMove),
        uci: { from: l.from, to: l.to },
      })));
    })();
    return () => {
      live = false;
      cancelThinking();
    };
  }, [fen]);

  const play = (m: BoardMove) => {
    const c = chess.current;
    const before = c.fen();
    const made = c.move({ from: m.from, to: m.to, promotion: m.promotion });
    fens.current.push(before);
    playMove(made, c.isCheck());
    setLastMove([made.from, made.to]);
    setFen(c.fen());
  };

  const undo = () => {
    chess.current.undo();
    fens.current.pop();
    setLastMove(null);
    setFen(chess.current.fen());
  };

  const history = chess.current.history();
  const opening = !startParam ? openingName(history) : null;
  const size = Math.floor(Math.max(220, Math.min(Math.min(width, MAX_CONTENT) - 30 - BOARD_CHROME, height - insets.top - insets.bottom - 320)));
  const over = chess.current.isGameOver();

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={10}><BackIcon size={28} /></Pressable>
          <View style={{ flex: 1 }}>
            <Display size={20}>Analysis board</Display>
            <Body size={13} numberOfLines={1}>{opening ?? 'Play moves for both sides'}</Body>
          </View>
          <Body size={12} bold>{depth ? `Depth ${depth}` : ''}</Body>
        </View>
        <View style={styles.boardRow}>
          <EvalBar whiteCp={whiteCp} height={size + BOARD_CHROME - 6} flipped={flipped} />
          <Board fen={fen} size={size} orientation={flipped ? 'b' : 'w'} movable={over ? null : (fen.split(' ')[1] as 'w' | 'b')} onMove={play} lastMove={lastMove} arrow={lines[0] ? { ...lines[0].uci, color: colors.leaf } : null} />
        </View>
        <View style={styles.lines}>
          {over && <Body bold color={colors.ink}>{chess.current.isCheckmate() ? 'Checkmate' : 'Draw'}</Body>}
          {!over && lines.length === 0 && <Body>Thinking</Body>}
          {lines.map((l, i) => (
            <Pressable key={l.san} accessibilityRole="button" accessibilityLabel={`Play ${l.san}, evaluation ${l.label}`} onPress={() => play({ from: l.uci.from, to: l.uci.to, promotion: chess.current.moves({ verbose: true }).find((m) => m.from === l.uci.from && m.to === l.uci.to)?.promotion })} style={[styles.line, i === 0 && { borderColor: colors.leaf }]}>
              <View style={styles.evalChip}><Body size={13} bold color={colors.ink}>{l.label}</Body></View>
              <Body size={15} bold color={colors.ink}>{l.san}</Body>
            </Pressable>
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip} contentContainerStyle={styles.stripInner}>
          {history.map((san, i) => (
            <Body key={i} size={14} bold={i === history.length - 1} color={i === history.length - 1 ? colors.ink : colors.muted}>{i % 2 === 0 ? `${i / 2 + 1}. ` : ''}{san}</Body>
          ))}
        </ScrollView>
        <View style={styles.actions}>
          <ActionButton label="Undo" icon={<UndoIcon />} onPress={undo} disabled={history.length === 0} />
          <ActionButton label="Flip" icon={<FlipIcon />} onPress={() => setFlipped(!flipped)} />
        </View>
      </View>
    </View>
  );
}

const styles = themed(() => ({
  root: { flex: 1, backgroundColor: colors.page },
  inner: { flex: 1, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 6 },
  boardRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 4, paddingVertical: 2 },
  lines: { paddingHorizontal: 10, paddingTop: 8, gap: 5, minHeight: 118 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 6, borderWidth: 2, borderColor: colors.line, borderRadius: shape.button, backgroundColor: colors.card },
  evalChip: { minWidth: 54, alignItems: 'center', paddingVertical: 2, borderRadius: 6, backgroundColor: colors.wash },
  strip: { flexGrow: 0, marginHorizontal: 10, marginTop: 'auto' },
  stripInner: { gap: 10, alignItems: 'center', height: 26 },
  actions: { flexDirection: 'row', gap: 8, paddingHorizontal: 10, paddingTop: 6 },
}));
