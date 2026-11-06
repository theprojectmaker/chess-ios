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
  elo: [number, number];
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

// The hardest puzzles of a theme, counted back from its end: the list is sorted easiest first.
function hardLessons(theme: Theme, count: number, fromEnd: number): PathNode[] {
  const all = puzzlesFor(theme);
  const out: PathNode[] = [];
  for (let i = 0; i < count; i++) {
    const start = all.length - fromEnd + i * LESSON_SIZE;
    const puzzles = all.slice(start, start + LESSON_SIZE);
    if (puzzles.length < LESSON_SIZE) break;
    out.push({ kind: 'lesson', id: `${theme}-hard-${fromEnd}-${i + 1}`, title: `${THEME_NAME[theme]}: hard ${i + 1}`, about: THEME_INFO[theme].learn, piece: THEME_PIECE[theme], puzzles });
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

export const UNITS: Unit[] = ([
  { title: 'Meet the pieces', about: 'New to chess? Start with your teacher', elo: [100, 300], color: '#D98A0B', lip: '#A86600', nodes: [teach('teach-sliders'), teach('teach-knight-pawn'), teach('teach-mate'), teach('teach-opening'), botNode(1)] },
  { title: 'Finish the game', about: 'Checkmate in one move', elo: [200, 450], color: colors.leaf, lip: colors.leafLip, nodes: [...lessons('mate1', 3), botNode(2)] },
  { title: 'Grab what is free', about: 'Stop missing loose pieces', elo: [350, 600], color: colors.sky, lip: colors.skyLip, nodes: [...lessons('hanging', 3), botNode(3)] },
  { title: 'Double attacks', about: 'Hit two targets with one move', elo: [500, 900], color: '#2FB5A8', lip: '#1F8F84', nodes: [teach('teach-fork'), ...lessons('fork', 3), botNode(4)] },
  { title: 'The back rank', about: 'Punish a boxed-in king', elo: [700, 1000], color: colors.coral, lip: colors.coralLip, nodes: [...lessons('backRank', 3), ...lessons('mate1', 1)] },
  { title: 'Lines of attack', about: 'Skewers and discovered attacks', elo: [800, 1250], color: colors.grape, lip: colors.grapeLip, nodes: [teach('teach-lines'), ...lessons('skewer', 1), ...lessons('discovered', 1), botNode(5)] },
  { title: 'Think two moves', about: 'Checkmate in two', elo: [1000, 1400], color: '#5B7FF0', lip: '#3F5FCC', nodes: [teach('teach-square'), ...lessons('mate2', 3)] },
  { title: 'Win material', about: 'Harder tactics that win something', elo: [1200, 1600], color: colors.flame, lip: '#D96A20', nodes: [...hardLessons('material', 3, 25), botNode(6)] },
  { title: 'Calculate', about: 'Checkmate in three', elo: [1400, 1900], color: colors.ink, lip: '#111A22', nodes: [teach('teach-opposition'), ...lessons('mate3', 3), botNode(7)] },
  { title: 'Think like a master', about: 'Sacrifices, technique and the hardest tactics', elo: [1800, 2500], color: '#7A3FD1', lip: '#5B2BA6', nodes: [teach('teach-smothered'), teach('teach-lucena'), ...hardLessons('material', 2, 10), botNode(8), botNode(9), botNode(10)] },
] as Unit[]).filter((u) => u.nodes.length > 1);

export const ALL_NODES: PathNode[] = UNITS.flatMap((u) => u.nodes);

export function getLesson(id: string): (PathNode & { kind: 'lesson' }) | undefined {
  return ALL_NODES.find((n): n is PathNode & { kind: 'lesson' } => n.kind === 'lesson' && n.id === id);
}

export function isDone(node: PathNode, p: Progress): boolean {
  return node.kind === 'bot' ? !!p.botsPlayed[node.level] : p.lessonsDone[node.id] !== undefined;
}

/** Your Elo opens every unit at or below your level, so a strong player never starts from zero. */
export function unitOpen(unit: Unit, p: Progress): boolean {
  return unit.elo[0] <= p.rating;
}

function unitOf(node: PathNode): Unit {
  return UNITS.find((u) => u.nodes.includes(node))!;
}

/** The first unfinished step above your level. Earlier steps stay open, later ones are locked. */
export function currentIndex(p: Progress): number {
  const i = ALL_NODES.findIndex((n) => n.kind !== 'teach' && !isDone(n, p) && !unitOpen(unitOf(n), p));
  const firstOpenGap = ALL_NODES.findIndex((n) => n.kind !== 'teach' && !isDone(n, p));
  return firstOpenGap >= 0 && (i < 0 || firstOpenGap < i) ? firstOpenGap : i < 0 ? ALL_NODES.length : i;
}

export function isLocked(node: PathNode, p: Progress): boolean {
  if (node.kind === 'teach' || unitOpen(unitOf(node), p)) return false;
  return ALL_NODES.indexOf(node) > currentIndex(p);
}

/** The unit whose band contains your rating, for pointing you at the right lessons. */
export function unitForRating(rating: number): Unit {
  let best = UNITS[0];
  for (const u of UNITS) if (u.elo[0] <= rating) best = u;
  return best;
}

/** The same puzzle all day, from the themes that make a satisfying daily. */
export function dailyPuzzle(day: string): Puzzle {
  const pool = PUZZLES.filter((x) => ['mate2', 'fork', 'skewer', 'discovered', 'material', 'backRank'].includes(x.theme));
  let hash = 0;
  for (const ch of day) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return pool[hash % pool.length];
}
