// Start positions for the alternative ways to play. Nothing here depends on the app, so scripts can test it.
export const STANDARD_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export type GameMode = 'standard' | 'shuffle' | 'odds';

export const MODE_INFO: Record<GameMode, { name: string; about: string }> = {
  standard: { name: 'Standard', about: 'Normal chess' },
  shuffle: { name: 'Shuffle', about: 'Random back rows, no castling' },
  odds: { name: 'Queen odds', about: 'The bot starts without its queen' },
};

export const CLOCKS = [0, 10, 5, 3, 1];

/** Back rows are mirrored and bishops stay on opposite colors, so both sides start even. */
export function shuffleFen(random: () => number = Math.random): string {
  const slots: (string | null)[] = Array(8).fill(null);
  const take = (from: number[]) => {
    const open = from.filter((i) => slots[i] === null);
    return open[Math.floor(random() * open.length)];
  };
  slots[take([0, 2, 4, 6])] = 'b';
  slots[take([1, 3, 5, 7])] = 'b';
  for (const piece of ['q', 'n', 'n', 'r', 'r', 'k']) slots[take([0, 1, 2, 3, 4, 5, 6, 7])] = piece;
  const row = slots.join('');
  return `${row}/pppppppp/8/8/8/8/PPPPPPPP/${row.toUpperCase()} w - - 0 1`;
}

export function queenOddsFen(botColor: 'w' | 'b'): string {
  const rows = STANDARD_FEN.split(' ');
  const parts = rows[0].split('/');
  if (botColor === 'b') parts[0] = 'rnb1kbnr';
  else parts[7] = 'RNB1KBNR';
  rows[0] = parts.join('/');
  return rows.join(' ');
}

export interface Endgame {
  id: string;
  name: string;
  tip: string;
  fen: string;
}

export const ENDGAMES: Endgame[] = [
  { id: 'two-rooks', name: 'Two rooks', tip: 'Take turns checking and walk the king to the edge, like climbing a ladder.', fen: '8/8/3k4/8/8/8/8/R3K2R w - - 0 1' },
  { id: 'queen', name: 'King and queen', tip: 'Box the king in with your queen, then bring your own king to help. Watch for stalemate.', fen: '8/8/3k4/8/8/8/8/3QK3 w - - 0 1' },
  { id: 'rook', name: 'King and rook', tip: 'Your rook cuts off a line, and your king does the pushing. Use them together.', fen: '8/8/3k4/8/8/8/8/4K2R w - - 0 1' },
  { id: 'bishops', name: 'Two bishops', tip: 'Side by side the bishops build a wall. Force the king into a corner.', fen: '8/8/3k4/8/8/8/8/2B1KB2 w - - 0 1' },
  { id: 'pawn', name: 'King and pawn', tip: 'Lead with your king, not your pawn. Try to take the square in front of it.', fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1' },
  { id: 'promote', name: 'Promote and mate', tip: 'Queen the pawn first, then finish with the checkmate you know.', fen: '8/P7/8/8/8/5k2/8/K7 w - - 0 1' },
];

export function getEndgame(id: string | undefined): Endgame | undefined {
  return ENDGAMES.find((e) => e.id === id);
}
