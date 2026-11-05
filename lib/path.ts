import { getBot, type PieceType } from './bots';
import { PUZZLES, puzzlesFor, THEME_INFO, type Puzzle, type Theme } from './puzzles';
import type { Progress } from './storage';
import { TEACHINGS } from './teachings';
import { colors } from './theme';

export const LESSON_SIZE = 5;

export type PathNode =
  | { kind: 'lesson'; id: string; title: string; about: string; piece: PieceType; puzzles: Puzzle[] }
  | { kind: 'bot'; id: string; title: string; about: string; piece: PieceType; level: number }
  | { kind: 'teach'; id: string; title: string; about: string; piece: PieceType };

export interface Unit {
  title: string;
  about: string;
  color: string;
  lip: string;
  nodes: PathNode[];
}

const THEME_PIECE: Record<Theme, PieceType> = {
  mate1: 'k', mate2: 'k', mate3: 'k', backRank: 'r', hanging: 'p', fork: 'n', pin: 'b', skewer: 'r', discovered: 'q', promotion: 'p', material: 'q',
};
const THEME_NAME: Record<Theme, string> = {
  mate1: 'Checkmate in 1', mate2: 'Checkmate in 2', mate3: 'Checkmate in 3', backRank: 'Back rank mate', hanging: 'Free pieces', fork: 'Forks', pin: 'Pins', skewer: 'Skewers', discovered: 'Discovered attacks', promotion: 'Promotion', material: 'Win material',
};

const used: Partial<Record<Theme, number>> = {};

function lessons(theme: Theme, count: number): PathNode[] {
  const all = puzzlesFor(theme);
  const out: PathNode[] = [];
  for (let i = 0; i < count; i++) {
    const start = used[theme] ?? 0;
    const puzzles = all.slice(start, start + LESSON_SIZE);
    if (puzzles.length < LESSON_SIZE) break;
    used[theme] = start + LESSON_SIZE;
    out.push({
      kind: 'lesson',
      id: `${theme}-${start / LESSON_SIZE + 1}`,
      title: `${THEME_NAME[theme]} ${start / LESSON_SIZE + 1}`,
      about: THEME_INFO[theme].learn,
      piece: THEME_PIECE[theme],
      puzzles,
    });
  }
  return out;
}

function botNode(level: number): PathNode {
  const bot = getBot(level);
  return { kind: 'bot', id: `bot-${level}`, title: `Play ${bot.name}`, about: bot.blurb, piece: bot.piece, level };
}

function teach(id: string): PathNode {
  const t = TEACHINGS.find((x) => x.id === id)!;
  return { kind: 'teach', id: t.id, title: t.title, about: t.about, piece: t.piece };
}

export const UNITS: Unit[] = [
  { title: 'Meet the pieces', about: 'New to chess? Start with your teacher', color: colors.sun, lip: colors.sunLip, nodes: [teach('teach-sliders'), teach('teach-knight-pawn'), teach('teach-mate'), teach('teach-opening')] },
  { title: 'Finish the game', about: 'Checkmate in one move', color: colors.leaf, lip: colors.leafLip, nodes: [...lessons('mate1', 3), botNode(1)] },
  { title: 'Grab what is free', about: 'Stop missing loose pieces', color: colors.sky, lip: colors.skyLip, nodes: [...lessons('hanging', 3), botNode(2)] },
  { title: 'Double attacks', about: 'Hit two targets with one move', color: '#2FB5A8', lip: '#1F8F84', nodes: [teach('teach-fork'), ...lessons('fork', 3), botNode(3)] },
  { title: 'The back rank', about: 'Punish a boxed-in king', color: colors.coral, lip: colors.coralLip, nodes: [...lessons('backRank', 3), ...lessons('mate1', 1), botNode(4)] },
  { title: 'Lines of attack', about: 'Skewers and discovered attacks', color: colors.grape, lip: colors.grapeLip, nodes: [teach('teach-lines'), ...lessons('skewer', 1), ...lessons('discovered', 1), botNode(5)] },
  { title: 'Win material', about: 'Find the one move that wins something', color: colors.flame, lip: '#D96A20', nodes: [...lessons('material', 3), botNode(6)] },
  { title: 'Think two moves', about: 'Checkmate in two', color: '#5B7FF0', lip: '#3F5FCC', nodes: [...lessons('mate2', 3), botNode(7)] },
  { title: 'Calculate', about: 'Checkmate in three', color: colors.ink, lip: '#111A22', nodes: [...lessons('mate3', 3), ...lessons('material', 2), botNode(8)] },
].filter((u) => u.nodes.length > 1);

export const ALL_NODES: PathNode[] = UNITS.flatMap((u) => u.nodes);

export function getLesson(id: string): (PathNode & { kind: 'lesson' }) | undefined {
  return ALL_NODES.find((n): n is PathNode & { kind: 'lesson' } => n.kind === 'lesson' && n.id === id);
}

export function isDone(node: PathNode, p: Progress): boolean {
  return node.kind === 'bot' ? !!p.botsPlayed[node.level] : p.lessonsDone[node.id] !== undefined;
}

/** The first unfinished lesson or bot. Teacher lessons are always open and never hold you back. */
export function currentIndex(p: Progress): number {
  const i = ALL_NODES.findIndex((n) => n.kind !== 'teach' && !isDone(n, p));
  return i < 0 ? ALL_NODES.length : i;
}

/** The same puzzle all day, from the themes that make a satisfying daily. */
export function dailyPuzzle(day: string): Puzzle {
  const pool = PUZZLES.filter((x) => ['mate2', 'fork', 'skewer', 'discovered', 'material', 'backRank'].includes(x.theme));
  let hash = 0;
  for (const ch of day) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return pool[hash % pool.length];
}
