export type PuzzleTheme =
  | 'mateIn1'
  | 'mateIn2'
  | 'fork'
  | 'pin'
  | 'skewer'
  | 'backRank'
  | 'discoveredAttack'
  | 'deflection'
  | 'hangingPiece'
  | 'endgame';

export interface Puzzle {
  id: string;
  title: string;
  theme: PuzzleTheme;
  difficulty: 1 | 2 | 3 | 4 | 5;
  fen: string;
  /** SAN moves alternating player / forced opponent reply, starting with the player's move. */
  solution: string[];
  explanation: string;
}

export const PUZZLES: Puzzle[] = [
  {
    id: 'p001',
    title: 'Back-rank finish',
    theme: 'mateIn1',
    difficulty: 1,
    fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',
    solution: ['Ra8#'],
    explanation: 'The rook slides to the back rank — the king has nowhere to run.',
  },
  {
    id: 'p002',
    title: 'Queen delivers',
    theme: 'mateIn1',
    difficulty: 1,
    fen: '6k1/5ppp/8/8/8/8/5PPP/4Q1K1 w - - 0 1',
    solution: ['Qe8#'],
    explanation: 'Trap the king on the back rank — his own pawns block every escape.',
  },
  {
    id: 'p003',
    title: 'Smothered corner',
    theme: 'mateIn1',
    difficulty: 2,
    fen: '6rk/6pp/7N/8/8/8/8/6K1 w - - 0 1',
    solution: ['Nf7#'],
    explanation: "The king is smothered by its own rook and pawns — the knight alone delivers mate.",
  },
  {
    id: 'p004',
    title: 'Knight fork finish',
    theme: 'mateIn1',
    difficulty: 2,
    fen: '1k6/pp6/8/8/8/8/1N6/1K6 w - - 0 1',
    solution: ['Na4+'],
    explanation: 'A forcing check — look for pieces that attack the king with no blocks available.',
  },
  {
    id: 'p005',
    title: 'Simple fork',
    theme: 'fork',
    difficulty: 1,
    fen: '4k3/8/8/3n4/8/2Q5/8/4K3 b - - 0 1',
    solution: ['Nxc3'],
    explanation: 'The knight grabs the queen for free — always scan for undefended pieces.',
  },
  {
    id: 'p006',
    title: 'Knight fork, king and rook',
    theme: 'fork',
    difficulty: 2,
    fen: '4r1k1/8/8/8/4N3/8/8/7K w - - 0 1',
    solution: ['Nf6+'],
    explanation: 'This check forks the king and the rook — the rook falls next move.',
  },
  {
    id: 'p007',
    title: 'Pin and win',
    theme: 'pin',
    difficulty: 2,
    fen: '4k3/4r3/8/8/8/8/4Q3/4K3 w - - 0 1',
    solution: ['Qxe7+'],
    explanation: "The rook is pinned to its own king along the e-file and can't move away in time.",
  },
  {
    id: 'p008',
    title: 'Skewer the king',
    theme: 'skewer',
    difficulty: 2,
    fen: '8/8/4k3/8/4q3/8/4R3/4K3 w - - 0 1',
    solution: ['Re4'],
    explanation: 'The rook lines up king and queen on the same file — the queen is lost.',
  },
  {
    id: 'p009',
    title: 'Snatch the stray queen',
    theme: 'hangingPiece',
    difficulty: 2,
    fen: 'q3k3/8/8/8/8/8/8/Q3K3 w - - 0 1',
    solution: ['Qxa8+'],
    explanation: 'The enemy queen wandered off with no defender nearby — just take it, with check.',
  },
  {
    id: 'p010',
    title: 'Hanging bishop',
    theme: 'hangingPiece',
    difficulty: 1,
    fen: '4k3/8/8/3b4/8/8/8/3QK3 w - - 0 1',
    solution: ['Qxd5'],
    explanation: "Nothing guards the bishop — just take it.",
  },
  {
    id: 'p011',
    title: 'Discovered check',
    theme: 'discoveredAttack',
    difficulty: 3,
    fen: '4k3/8/8/8/4B3/8/4R3/4K3 w - - 0 1',
    solution: ['Bd5+'],
    explanation: 'Moving the bishop off the e-file uncovers a check from the rook behind it.',
  },
  {
    id: 'p012',
    title: 'Two-move mate: clear the escape',
    theme: 'mateIn2',
    difficulty: 3,
    fen: '6k1/6p1/6P1/8/8/8/8/R5K1 w - - 0 1',
    solution: ['Kg2', 'Kh8', 'Ra8#'],
    explanation: "First tidy up (the king is already safe here), then swing the rook to the open back rank.",
  },
  {
    id: 'p013',
    title: 'Rook to the back rank',
    theme: 'mateIn1',
    difficulty: 2,
    fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
    solution: ['Rd8#'],
    explanation: "The king's own pawns seal every flight square — the rook alone finishes the game.",
  },
  {
    id: 'p014',
    title: 'Rook lift mate',
    theme: 'mateIn2',
    difficulty: 4,
    fen: '5rk1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
    solution: ['Re8', 'Rxe8', 'Kf1'],
    explanation: 'Trading off the only defender leaves the back rank undefended for later.',
  },
  {
    id: 'p015',
    title: 'King and pawn endgame: outflank',
    theme: 'endgame',
    difficulty: 2,
    fen: '8/8/8/4k3/8/4K3/4P3/8 w - - 0 1',
    solution: ['Kd3'],
    explanation: 'Step to the side rather than straight ahead — in king-and-pawn endings the king must outflank, not shove.',
  },
  {
    id: 'p016',
    title: 'Promote the passer',
    theme: 'endgame',
    difficulty: 2,
    fen: '8/4P3/4K3/8/8/8/6k1/8 w - - 0 1',
    solution: ['e8=Q+'],
    explanation: 'Nothing stops the pawn from queening — and it comes with check.',
  },
  {
    id: 'p017',
    title: 'Pin the knight to the queen',
    theme: 'pin',
    difficulty: 3,
    fen: '3qk3/8/8/8/8/3N4/8/3RK3 b - - 0 1',
    solution: ['Qd5'],
    explanation: 'Lining up on the file pins the knight — it can no longer guard against the rook taking later.',
  },
  {
    id: 'p018',
    title: 'Fork king and queen',
    theme: 'fork',
    difficulty: 3,
    fen: '3qk3/8/8/8/5N2/8/8/4K3 w - - 0 1',
    solution: ['Ne6'],
    explanation: 'The knight jumps to a square that attacks both the king and the queen at once.',
  },
  {
    id: 'p019',
    title: 'Back-rank weakness',
    theme: 'backRank',
    difficulty: 2,
    fen: '2r2rk1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
    solution: ['Re8'],
    explanation: 'Trading rooks exposes the back rank for the next invasion.',
  },
  {
    id: 'p020',
    title: 'Skewer to win the rook',
    theme: 'skewer',
    difficulty: 2,
    fen: '8/8/8/8/3k4/8/3r4/3RK3 w - - 0 1',
    solution: ['Rd2'],
    explanation: 'Opposing the rook on the file sets up winning it next move since the king must move off first.',
  },
  {
    id: 'p021',
    title: 'Discovered attack on the queen',
    theme: 'discoveredAttack',
    difficulty: 3,
    fen: '3qk3/8/8/8/3B4/8/3R4/3K4 w - - 0 1',
    solution: ['Bb6'],
    explanation: 'Sidestepping the bishop reveals the rook attacking the queen on the d-file.',
  },
  {
    id: 'p022',
    title: 'Mating net with two rooks',
    theme: 'mateIn1',
    difficulty: 2,
    fen: '6k1/8/6K1/8/8/8/8/3R1R2 w - - 0 1',
    solution: ['Rd8#'],
    explanation: 'The white king already seals off every escape on the 7th rank — the rook seals the rest.',
  },
  {
    id: 'p023',
    title: 'Clearing the defender',
    theme: 'deflection',
    difficulty: 4,
    fen: '2r3k1/5ppp/8/8/8/8/5PPP/2R3K1 w - - 0 1',
    solution: ['Rxc8'],
    explanation: "Removing the only piece that could contest the file leaves nothing to stop the next invasion.",
  },
  {
    id: 'p024',
    title: 'Hanging rook on an open file',
    theme: 'hangingPiece',
    difficulty: 1,
    fen: '4k3/8/8/8/8/8/3r4/3RK3 w - - 0 1',
    solution: ['Rxd2'],
    explanation: 'The rook is undefended — trade it off for free material.',
  },
  {
    id: 'p025',
    title: 'Two knights fork',
    theme: 'fork',
    difficulty: 3,
    fen: '4k3/8/8/8/8/8/5N2/3qK3 w - - 0 1',
    solution: ['Nxd1'],
    explanation: 'Capturing the queen outright — nothing guards it.',
  },
  {
    id: 'p026',
    title: 'King walk in a pawn race',
    theme: 'endgame',
    difficulty: 1,
    fen: '8/8/8/8/8/k7/5P2/5K2 w - - 0 1',
    solution: ['f3'],
    explanation: 'Advance carefully and keep the king in front of the pawn as its shield.',
  },
];

export function getPuzzleById(id: string): Puzzle | undefined {
  return PUZZLES.find((puzzle) => puzzle.id === id);
}
