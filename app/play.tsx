import { Chess, type Square } from 'chess.js';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import ChessBoard from '../components/ChessBoard';
import { BOT_LADDER, pickBotMove, type BotProfile } from '../lib/bot';
import { setLastReview } from '../lib/gameStore';
import { recordGameResult } from '../lib/storage';
import { colors, radii, shadow } from '../lib/theme';

function haptic() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
}

function gameEndInfo(chess: Chess): { over: boolean; result?: 'win' | 'loss' | 'draw'; reason?: string } {
  if (!chess.isGameOver()) return { over: false };
  if (chess.isCheckmate()) {
    const winner = chess.turn() === 'w' ? 'b' : 'w';
    return { over: true, result: winner === 'w' ? 'win' : 'loss', reason: 'Checkmate' };
  }
  if (chess.isStalemate()) return { over: true, result: 'draw', reason: 'Stalemate' };
  if (chess.isThreefoldRepetition()) return { over: true, result: 'draw', reason: 'Threefold repetition' };
  if (chess.isInsufficientMaterial()) return { over: true, result: 'draw', reason: 'Insufficient material' };
  return { over: true, result: 'draw', reason: 'Draw' };
}

export default function PlayScreen() {
  const router = useRouter();
  const [bot, setBot] = useState<BotProfile | null>(null);
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const chessRef = useRef(new Chess());
  const [fen, setFen] = useState(chessRef.current.fen());
  const [selected, setSelected] = useState<Square | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [thinking, setThinking] = useState(false);
  const [status, setStatus] = useState('Your move');
  const gameOverHandled = useRef(false);

  const chess = chessRef.current;

  const legalTargets = useMemo(() => {
    if (!selected) return [];
    return chess.moves({ square: selected, verbose: true }).map((m) => m.to);
  }, [selected, fen]);

  const checkSquare = useMemo(() => {
    if (!chess.isCheck()) return null;
    const turn = chess.turn();
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = board[r][c];
        if (cell && cell.type === 'k' && cell.color === turn) {
          const file = 'abcdefgh'[c];
          const rank = 8 - r;
          return `${file}${rank}`;
        }
      }
    }
    return null;
  }, [fen]);

  function finishIfOver() {
    const info = gameEndInfo(chess);
    if (info.over && !gameOverHandled.current) {
      gameOverHandled.current = true;
      const xp = info.result === 'win' ? 30 : info.result === 'draw' ? 10 : 5;
      recordGameResult(info.result ?? 'draw', xp).finally(() => {
        setLastReview({
          result: info.result ?? 'draw',
          reason: info.reason ?? '',
          moves: chess.history(),
          playerColor,
          botName: bot?.name ?? 'Bot',
        });
        router.replace('/review');
      });
      return true;
    }
    return false;
  }

  function botTurn() {
    if (!bot) return;
    setThinking(true);
    setStatus(`${bot.name} is thinking…`);
    setTimeout(() => {
      const move = pickBotMove(chess.fen(), bot);
      if (move) {
        chess.move({ from: move.from, to: move.to, promotion: move.promotion });
        setLastMove({ from: move.from, to: move.to });
        setFen(chess.fen());
      }
      setThinking(false);
      setStatus('Your move');
      if (!finishIfOver()) {
        setStatus('Your move');
      }
    }, 300);
  }

  function onSquarePress(square: string) {
    if (thinking || !bot) return;
    if (chess.turn() !== playerColor) return;

    const sq = square as Square;
    if (selected) {
      const moves = chess.moves({ square: selected, verbose: true });
      const found = moves.find((m) => m.to === sq);
      if (found) {
        chess.move({ from: selected, to: sq, promotion: 'q' });
        setLastMove({ from: selected, to: sq });
        setSelected(null);
        setFen(chess.fen());
        haptic();
        if (!finishIfOver()) {
          const next = chess.turn();
          if (next !== playerColor) botTurn();
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

  function startGame(profile: BotProfile, color: 'w' | 'b') {
    chessRef.current = new Chess();
    gameOverHandled.current = false;
    setBot(profile);
    setPlayerColor(color);
    setFen(chessRef.current.fen());
    setSelected(null);
    setLastMove(null);
    setStatus(color === 'w' ? 'Your move' : `${profile.name} is thinking…`);
    if (color === 'b') {
      setTimeout(() => {
        setThinking(true);
        setTimeout(() => {
          const move = pickBotMove(chessRef.current.fen(), profile);
          if (move) {
            chessRef.current.move({ from: move.from, to: move.to, promotion: move.promotion });
            setLastMove({ from: move.from, to: move.to });
            setFen(chessRef.current.fen());
          }
          setThinking(false);
          setStatus('Your move');
        }, 300);
      }, 50);
    }
  }

  if (!bot) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.selectContent}>
        <Text style={styles.selectTitle}>Choose your opponent</Text>
        <Text style={styles.selectSubtitle}>Every bot plays real, legal chess — the higher the level, the sharper the tactics.</Text>
        {BOT_LADDER.map((profile) => (
          <Pressable key={profile.level} style={styles.botCard} onPress={() => startGame(profile, 'w')}>
            <View style={styles.botBadge}>
              <Text style={styles.botBadgeText}>{profile.level}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.botName}>{profile.name}</Text>
              <Text style={styles.botBlurb}>{profile.blurb}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.gameHeader}>
        <Text style={styles.gameHeaderText}>vs {bot.name}</Text>
        <Text style={styles.statusText}>{status}</Text>
      </View>
      <View style={styles.boardWrap}>
        <ChessBoard
          board={chess.board()}
          flipped={playerColor === 'b'}
          selectedSquare={selected}
          legalTargets={legalTargets}
          lastMove={lastMove}
          checkSquare={checkSquare}
          onSquarePress={onSquarePress}
        />
      </View>
      <Pressable
        style={styles.resignButton}
        onPress={() => {
          setBot(null);
        }}
      >
        <Text style={styles.resignText}>Change opponent</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  selectContent: { padding: 16, gap: 12, paddingBottom: 40 },
  selectTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  selectSubtitle: { fontSize: 13, color: colors.textMuted, marginBottom: 6 },
  botCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: 14,
    ...shadow,
  },
  botBadge: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botBadgeText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  botName: { fontSize: 16, fontWeight: '700', color: colors.text },
  botBlurb: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  gameHeader: { paddingHorizontal: 16, paddingTop: 10, alignItems: 'center' },
  gameHeaderText: { fontSize: 16, fontWeight: '700', color: colors.text },
  statusText: { fontSize: 13, color: colors.textMuted, marginTop: 2, marginBottom: 6 },
  boardWrap: { alignItems: 'center', marginTop: 8 },
  resignButton: { alignSelf: 'center', marginTop: 20, padding: 10 },
  resignText: { color: colors.danger, fontWeight: '700' },
});
