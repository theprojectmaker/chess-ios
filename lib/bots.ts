import type { ThinkOptions } from './engine';

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface Bot {
  level: number;
  elo: number; // from matches against Stockfish and each other, see SHIP.md for how far to trust it
  name: string;
  piece: PieceType;
  color: string;
  lip: string;
  blurb: string;
  think: ThinkOptions;
  useBook: boolean;
}

export const BOTS: Bot[] = [
  {
    level: 1, elo: 100, name: 'Pip', piece: 'p', color: '#8BCF5A', lip: '#6AAE3A',
    blurb: 'Learning how the pieces move. Mostly random.',
    think: { maxDepth: 1, timeMs: 100, margin: 300, blunderChance: 0.7, blunderMargin: 2000 }, useBook: false,
  },
  {
    level: 2, elo: 300, name: 'Milo', piece: 'p', color: '#58C13B', lip: '#3F9A28',
    blurb: 'Takes things sometimes. Often misses them.',
    think: { maxDepth: 1, timeMs: 100, margin: 200, blunderChance: 0.5, blunderMargin: 900 }, useBook: false,
  },
  {
    level: 3, elo: 550, name: 'Rosie', piece: 'n', color: '#2FB5A8', lip: '#1F8F84',
    blurb: 'Leaves pieces hanging a lot.',
    think: { maxDepth: 1, timeMs: 150, margin: 140, blunderChance: 0.4, blunderMargin: 600 }, useBook: false,
  },
  {
    level: 4, elo: 900, name: 'Bram', piece: 'b', color: '#2FA8F0', lip: '#1C85C7',
    blurb: 'Grabs free pieces, misses most threats.',
    think: { maxDepth: 2, timeMs: 200, margin: 90, blunderChance: 0.25, blunderMargin: 450 }, useBook: false,
  },
  {
    level: 5, elo: 1250, name: 'Nell', piece: 'r', color: '#5B7FF0', lip: '#3F5FCC',
    blurb: 'Sees one-move tricks. Slips under pressure.',
    think: { maxDepth: 2, timeMs: 300, margin: 50, blunderChance: 0.14, blunderMargin: 320 }, useBook: true,
  },
  {
    level: 6, elo: 1450, name: 'Otto', piece: 'q', color: '#A667F0', lip: '#8247CC',
    blurb: 'Knows openings and punishes loose pieces.',
    think: { maxDepth: 3, timeMs: 400, margin: 35, blunderChance: 0.08, blunderMargin: 220 }, useBook: true,
  },
  {
    level: 7, elo: 1800, name: 'Vera', piece: 'k', color: '#F064A8', lip: '#CC4486',
    blurb: 'Solid. You need a real plan.',
    think: { maxDepth: 4, timeMs: 600, margin: 22, blunderChance: 0.04, blunderMargin: 150 }, useBook: true,
  },
  {
    level: 8, elo: 1900, name: 'Sage', piece: 'b', color: '#E5533D', lip: '#BD3A26',
    blurb: 'Calculates deep lines and rarely slips.',
    think: { maxDepth: 5, timeMs: 900, margin: 12, blunderChance: 0.015, blunderMargin: 90 }, useBook: true,
  },
  {
    level: 9, elo: 2150, name: 'Ivan', piece: 'n', color: '#FF8A3D', lip: '#D96A20',
    blurb: 'Tough tactician with almost no mistakes.',
    think: { maxDepth: 7, timeMs: 1400, margin: 5 }, useBook: true,
  },
  {
    level: 10, elo: 2400, name: 'Atlas', piece: 'k', color: '#34424F', lip: '#1C2630',
    blurb: 'This app\'s engine at full strength, no handicaps.',
    think: { maxDepth: 40, timeMs: 2500 }, useBook: true,
  },
];

export function getBot(level: number): Bot {
  return BOTS.find((b) => b.level === level) ?? BOTS[0];
}
