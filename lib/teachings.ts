// Short guided lessons. A step with moves waits for one of them; a step without moves is read and tapped through.
export interface TeachStep {
  say: string;
  fen: string;
  moves?: string[];
  done?: string;
}
export interface Teaching {
  id: string;
  title: string;
  about: string;
  piece: 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
  steps: TeachStep[];
}

export const TEACHINGS: Teaching[] = [
  {
    id: 'teach-sliders', title: 'Rook, bishop, queen', about: 'The pieces that slide across the board.', piece: 'q',
    steps: [
      { say: 'Rooks slide in straight lines, as far as the path is clear. Move the rook up to d8.', fen: '7k/8/8/8/3R4/8/8/K7 w - - 0 1', moves: ['d4d8'], done: 'Straight lines only. Rooks love open files.' },
      { say: 'Bishops slide diagonally. Send this one to g7.', fen: '8/7k/8/8/3B4/8/8/K7 w - - 0 1', moves: ['d4g7'], done: 'A bishop stays on one color for the whole game.' },
      { say: 'The queen does both. Pieces capture by landing on an enemy. Take that rook.', fen: '7k/8/8/3r4/8/8/3Q4/K7 w - - 0 1', moves: ['d2d5'], done: 'The queen is your strongest piece, so do not lose her cheaply.' },
    ],
  },
  {
    id: 'teach-knight-pawn', title: 'Knights and pawns', about: 'The jumper, and the little ones that can become queens.', piece: 'n',
    steps: [
      { say: 'Knights move in an L: two squares, then one sideways. They jump over anything. Move to e6.', fen: '7k/8/8/8/3N4/8/8/K7 w - - 0 1', moves: ['d4e6'], done: 'Knights are the only pieces that can jump.' },
      { say: 'Knights capture where they land. Take the bishop.', fen: '7k/8/2b5/8/3N4/8/8/K7 w - - 0 1', moves: ['d4c6'], done: 'Nice jump.' },
      { say: 'A pawn on its first move can go one square or two. Push it two.', fen: '7k/8/8/8/8/8/4P3/K7 w - - 0 1', moves: ['e2e4'], done: 'After that first move, pawns go one square at a time.' },
      { say: 'Pawns capture diagonally, one square forward. Take the black pawn.', fen: '7k/8/8/3p4/4P3/8/8/K7 w - - 0 1', moves: ['e4d5'], done: 'Straight to move, diagonal to capture.' },
      { say: 'Reach the far side and a pawn becomes any piece. Push it and pick a queen.', fen: '7k/4P3/8/8/8/8/8/K7 w - - 0 1', moves: ['e7e8q'], done: 'That is called promotion. It often decides the game.' },
    ],
  },
  {
    id: 'teach-mate', title: 'Check and checkmate', about: 'How a game of chess actually ends.', piece: 'k',
    steps: [
      { say: 'Attacking the king is called check. Move the rook to h1 to give check.', fen: '7k/8/8/8/8/8/8/K5R1 w - - 0 1', moves: ['g1h1'], done: 'Check! Black must respond right away.' },
      { say: 'You are Black now, and your king is in check. Step off the e-file.', fen: '4k3/8/8/8/8/8/8/K3R3 b - - 0 1', moves: ['e8d8', 'e8d7', 'e8f7', 'e8f8'], done: 'You can also block a check or capture the attacker.' },
      { say: 'Checkmate is a check with no escape, and it wins the game. The king is boxed in by its own pawns. Finish it.', fen: '6k1/5ppp/8/8/8/8/8/K3R3 w - - 0 1', moves: ['e1e8'], done: 'Checkmate! This pattern is called a back rank mate.' },
      { say: 'Careful: here Black is not in check but has no legal move. That is stalemate, and the game is a draw. Winning players watch out for this.', fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1' },
    ],
  },
  {
    id: 'teach-opening', title: 'Start a game well', about: 'Three simple rules for your first ten moves.', piece: 'p',
    steps: [
      { say: 'Rule one: take the center. Push the e-pawn or the d-pawn two squares.', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', moves: ['e2e4', 'd2d4'], done: 'Center pawns give your pieces room to move.' },
      { say: 'Rule two: bring out your pieces. Move a knight toward the center.', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', moves: ['g1f3', 'b1c3'], done: 'Knights near the center control many squares.' },
      { say: 'Now develop the bishop so your kingside is clear.', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', moves: ['f1c4', 'f1b5'], done: 'Two pieces out, and you are almost ready.' },
      { say: 'Rule three: keep your king safe by castling. Move the king two squares toward the rook.', fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', moves: ['e1g1'], done: 'The rook hops over and the king is tucked away. You can only castle if neither piece has moved.' },
    ],
  },
  {
    id: 'teach-fork', title: 'What is a fork?', about: 'One move, two threats.', piece: 'n',
    steps: [
      { say: 'A fork attacks two things at once. Jump to c7: it checks the king and hits the rook.', fen: 'r3k3/8/8/1N6/8/8/8/7K w - - 0 1', moves: ['b5c7'], done: 'Black must save the king, so the rook falls next move. That is a fork.' },
    ],
  },
  {
    id: 'teach-lines', title: 'Pins and skewers', about: 'Attacking along a line.', piece: 'r',
    steps: [
      { say: 'A pin freezes a piece: if it moves, something bigger behind it is exposed. Put the rook on e1. The queen cannot leave the file without exposing the king.', fen: '4k3/8/8/4q3/8/8/5K2/R7 w - - 0 1', moves: ['a1e1'], done: 'Pinned. Your king protects that rook, so the queen is in real trouble.' },
      { say: 'A skewer is the reverse: attack the big piece, and when it moves you win what stood behind it. Give check on e1.', fen: '4q3/8/8/4k3/8/8/5K2/R7 w - - 0 1', moves: ['a1e1'], done: 'The king must step aside, and the queen behind it is next.' },
    ],
  },
  {
    id: 'teach-square', title: 'The rule of the square', about: 'Can a king catch a pawn? Count it without calculating.', piece: 'p',
    steps: [
      { say: 'Picture a square from the pawn to the top of the board. If the enemy king cannot step inside it, the pawn cannot be caught. The king is too far away here. Push the pawn.', fen: '8/8/8/8/P7/8/8/5k1K w - - 0 1', moves: ['a4a5'], done: 'The square just got smaller and the king is still outside. This pawn queens.' },
    ],
  },
  {
    id: 'teach-opposition', title: 'The opposition', about: 'Kings facing off, and who has to give way.', piece: 'k',
    steps: [
      { say: 'When kings face each other with one square between them, whoever must move gives way. That is the opposition. Here Black is to move and has it: White cannot get through, and this is a draw.', fen: '8/8/4k3/8/4K3/4P3/8/8 w - - 0 1' },
      { say: 'Now you can take it. Step your king right in front of the enemy king, two squares away.', fen: '4k3/8/8/3K4/4P3/8/8/8 w - - 0 1', moves: ['d5e6'], done: 'Black must give way, so your king shepherds the pawn home. A king on the 6th in front of its pawn wins.' },
    ],
  },
  {
    id: 'teach-smothered', title: 'The smothered mate', about: 'A queen sacrifice that wins on the spot.', piece: 'q',
    steps: [
      { say: 'The black king has almost no squares. Give up your queen on g8, with check. The king cannot take it, because your knight guards g8. Only the rook can.', fen: '5r1k/6pp/7N/8/8/1Q6/6K1/r7 w - - 0 1', moves: ['b3g8'], done: 'Black has to take with the rook, and that rook now blocks its own king. A sacrifice like this is what the review calls brilliant.' },
      { say: 'The king is walled in by its own pieces. Deliver the final check with your knight.', fen: '6rk/6pp/7N/8/8/8/6K1/r7 w - - 0 2', moves: ['h6f7'], done: 'Smothered mate. Only a knight can do this, because it jumps over the wall.' },
    ],
  },
  {
    id: 'teach-lucena', title: 'Building a bridge', about: 'The Lucena position, the most important rook ending.', piece: 'r',
    steps: [
      { say: 'Your king is stuck in front of the pawn. The winning idea starts with a quiet move: lift your rook to the 4th rank.', fen: '6K1/4k1P1/8/8/8/8/7r/5R2 w - - 0 1', moves: ['f1f4'], done: 'That rook will soon block the checks. Now the king can walk out.' },
      { say: 'After a run of checks your king has walked out. Block the last check with your rook. That is the bridge.', fen: '8/3k2P1/8/6K1/5R2/8/6r1/8 w - - 0 1', moves: ['f4g4'], done: 'No more checks, and the pawn queens. Every serious player knows this one.' },
    ],
  },
];

export function getTeaching(id: string): Teaching | undefined {
  return TEACHINGS.find((t) => t.id === id);
}
