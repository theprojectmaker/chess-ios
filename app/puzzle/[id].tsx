import { Chess, type Square } from 'chess.js';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ChessBoard from '../../components/ChessBoard';
import { getPuzzleById, PUZZLES } from '../../lib/puzzles';
import { recordPuzzleSolved } from '../../lib/storage';
import { colors, radii, shadow } from '../../lib/theme';

type FeedbackState = 'idle' | 'correct' | 'wrong' | 'solved';

export default function PuzzleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const puzzle = getPuzzleById(id ?? '');

  const chessRef = useRef(new Chess(puzzle?.fen));
  const [fen, setFen] = useState(chessRef.current.fen());
  const [stepIndex, setStepIndex] = useState(0);
  const [selected, setSelected] = useState<Square | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>('idle');

  const chess = chessRef.current;
  const playerColor = useMemo(() => new Chess(puzzle?.fen).turn(), [puzzle?.fen]);

  const legalTargets = useMemo(() => {
    if (!selected) return [];
    return chess.moves({ square: selected, verbose: true }).map((m) => m.to);
  }, [selected, fen]);

  if (!puzzle) {
    return (
      <View style={styles.container}>
        <Text style={styles.missing}>Puzzle not found.</Text>
      </View>
    );
  }

  function resetPuzzle() {
    chessRef.current = new Chess(puzzle!.fen);
    setStepIndex(0);
    setFen(chessRef.current.fen());
    setSelected(null);
    setLastMove(null);
    setFeedback('idle');
  }

  function goToNextPuzzle() {
    const idx = PUZZLES.findIndex((p) => p.id === puzzle!.id);
    const next = PUZZLES[idx + 1];
    if (next) {
      router.replace(`/puzzle/${next.id}`);
    } else {
      router.replace('/puzzles');
    }
  }

  function onSquarePress(square: string) {
    if (feedback === 'solved' || chess.turn() !== playerColor) return;
    const sq = square as Square;

    if (selected) {
      const moves = chess.moves({ square: selected, verbose: true });
      const attempt = moves.find((m) => m.to === sq);
      if (attempt) {
        const expectedSan = puzzle!.solution[stepIndex];
        const result = chess.move({ from: selected, to: sq, promotion: attempt.promotion ?? 'q' });
        setSelected(null);

        if (!result || result.san !== expectedSan) {
          if (result) chess.undo();
          setFeedback('wrong');
          setFen(chess.fen());
          setTimeout(() => setFeedback('idle'), 700);
          return;
        }

        setLastMove({ from: sq === selected ? selected : selected, to: sq });
        setFen(chess.fen());

        const isLastStep = stepIndex + 1 >= puzzle!.solution.length;
        if (isLastStep) {
          setFeedback('solved');
          recordPuzzleSolved(puzzle!.id);
        } else {
          setFeedback('correct');
          const replySan = puzzle!.solution[stepIndex + 1];
          setTimeout(() => {
            const replyMove = chess.move(replySan);
            if (replyMove) {
              setLastMove({ from: replyMove.from, to: replyMove.to });
            }
            setFen(chess.fen());
            setStepIndex(stepIndex + 2);
            setFeedback('idle');
          }, 500);
        }
        return;
      }
      const piece = chess.get(sq);
      if (piece && piece.color === playerColor) {
        setSelected(sq);
      } else {
        setSelected(null);
      }
      return;
    }

    const piece = chess.get(sq);
    if (piece && piece.color === playerColor) {
      setSelected(sq);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.puzzleTitle}>{puzzle.title}</Text>
        <Text style={styles.puzzleMeta}>
          {playerColor === 'w' ? 'White' : 'Black'} to move — find the best continuation
        </Text>
      </View>

      <View style={styles.boardWrap}>
        <ChessBoard
          board={chess.board()}
          flipped={playerColor === 'b'}
          selectedSquare={selected}
          legalTargets={legalTargets}
          lastMove={lastMove}
          onSquarePress={onSquarePress}
        />
      </View>

      {feedback === 'wrong' && <Text style={styles.wrongBanner}>Not quite — try again</Text>}
      {feedback === 'correct' && <Text style={styles.correctBanner}>Nice! Keep going…</Text>}

      {feedback === 'solved' && (
        <View style={styles.solvedCard}>
          <Text style={styles.solvedTitle}>Solved! 🎉</Text>
          <Text style={styles.solvedExplain}>{puzzle.explanation}</Text>
          <View style={styles.solvedButtons}>
            <Pressable style={styles.secondaryButton} onPress={resetPuzzle}>
              <Text style={styles.secondaryButtonText}>Retry</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={goToNextPuzzle}>
              <Text style={styles.primaryButtonText}>Next puzzle</Text>
            </Pressable>
          </View>
        </View>
      )}

      {feedback !== 'solved' && (
        <Pressable style={styles.hintButton} onPress={resetPuzzle}>
          <Text style={styles.hintButtonText}>Reset position</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16, alignItems: 'center' },
  missing: { color: colors.textMuted, marginTop: 40 },
  header: { alignItems: 'center', marginBottom: 10 },
  puzzleTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  puzzleMeta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  boardWrap: { marginTop: 4 },
  wrongBanner: { marginTop: 14, color: colors.danger, fontWeight: '700' },
  correctBanner: { marginTop: 14, color: colors.primary, fontWeight: '700' },
  hintButton: { marginTop: 18, padding: 10 },
  hintButtonText: { color: colors.textMuted, fontWeight: '600' },
  solvedCard: {
    marginTop: 18,
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: 18,
    alignItems: 'center',
    ...shadow,
  },
  solvedTitle: { fontSize: 20, fontWeight: '800', color: colors.primary },
  solvedExplain: { fontSize: 13, color: colors.textMuted, marginTop: 8, textAlign: 'center' },
  solvedButtons: { flexDirection: 'row', gap: 10, marginTop: 16 },
  primaryButton: { backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 18, borderRadius: radii.pill },
  primaryButtonText: { color: colors.white, fontWeight: '700' },
  secondaryButton: { backgroundColor: colors.border, paddingVertical: 10, paddingHorizontal: 18, borderRadius: radii.pill },
  secondaryButtonText: { color: colors.text, fontWeight: '700' },
});
