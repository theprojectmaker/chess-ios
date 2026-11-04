import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors } from '../lib/theme';

const PIECE_GLYPHS: Record<string, string> = {
  wp: '♙', wn: '♘', wb: '♗', wr: '♖', wq: '♕', wk: '♔',
  bp: '♟', bn: '♞', bb: '♝', br: '♜', bq: '♛', bk: '♚',
};

export interface BoardCell {
  type: string;
  color: 'w' | 'b';
}

interface Props {
  board: (BoardCell | null)[][]; // chess.js .board() — row 0 = rank 8
  flipped?: boolean;
  selectedSquare?: string | null;
  legalTargets?: string[];
  lastMove?: { from: string; to: string } | null;
  checkSquare?: string | null;
  onSquarePress?: (square: string) => void;
  maxSize?: number;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export default function ChessBoard({
  board,
  flipped = false,
  selectedSquare = null,
  legalTargets = [],
  lastMove = null,
  checkSquare = null,
  onSquarePress,
  maxSize,
}: Props) {
  const { width } = useWindowDimensions();
  const size = Math.min(maxSize ?? width - 24, 440);
  const cellSize = size / 8;

  const rows = flipped ? [...board].reverse() : board;

  return (
    <View style={[styles.board, { width: size, height: size }]}>
      {rows.map((rowCells, rowIdx) => {
        const displayRow = flipped ? rowIdx : rowIdx;
        const rank = flipped ? rowIdx + 1 : 8 - rowIdx;
        const cols = flipped ? [...rowCells].reverse() : rowCells;
        return (
          <View key={rowIdx} style={styles.row}>
            {cols.map((cell, colIdx) => {
              const file = flipped ? FILES[7 - colIdx] : FILES[colIdx];
              const square = `${file}${rank}`;
              const isDark = (rowIdx + colIdx) % 2 === 1;
              const isSelected = selectedSquare === square;
              const isTarget = legalTargets.includes(square);
              const isLastMove = lastMove && (lastMove.from === square || lastMove.to === square);
              const isCheck = checkSquare === square;

              return (
                <Pressable
                  key={square}
                  onPress={() => onSquarePress?.(square)}
                  style={[
                    styles.cell,
                    { width: cellSize, height: cellSize },
                    { backgroundColor: isDark ? colors.boardDark : colors.boardLight },
                    isLastMove && styles.lastMoveOverlay,
                    isCheck && styles.checkOverlay,
                    isSelected && styles.selectedOverlay,
                  ]}
                >
                  {cell && (
                    <Text style={[styles.piece, { fontSize: cellSize * 0.72 }, cell.color === 'w' ? styles.whitePiece : styles.blackPiece]}>
                      {PIECE_GLYPHS[`${cell.color}${cell.type}`]}
                    </Text>
                  )}
                  {isTarget && !cell && <View style={[styles.dot, { width: cellSize * 0.3, height: cellSize * 0.3 }]} />}
                  {isTarget && cell && <View style={[styles.captureRing, { width: cellSize * 0.9, height: cellSize * 0.9, borderRadius: cellSize }]} />}
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#3A3A3A',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  piece: {
    textAlign: 'center',
  },
  whitePiece: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  blackPiece: {
    color: '#1A1A1A',
  },
  dot: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: colors.boardMoveHint,
  },
  captureRing: {
    position: 'absolute',
    borderWidth: 4,
    borderColor: colors.boardMoveHint,
  },
  selectedOverlay: {
    backgroundColor: colors.boardHighlight,
  },
  lastMoveOverlay: {
    backgroundColor: colors.boardLastMove,
  },
  checkOverlay: {
    backgroundColor: colors.boardCheck,
  },
});
