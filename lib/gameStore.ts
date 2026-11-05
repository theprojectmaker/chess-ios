import AsyncStorage from '@react-native-async-storage/async-storage';
import { Chess, DEFAULT_POSITION } from 'chess.js';
import type { PositionEval } from './analysis';

const HISTORY_KEY = 'chess-games-v1';
const MAX_GAMES = 30;

export interface MoveRef {
  from: string;
  to: string;
  promotion?: string;
}

export interface StoredGame {
  id: string;
  date: number;
  result: 'win' | 'loss' | 'draw'; // for a two-player game, win means White won
  twoPlayer?: boolean;
  reason: string;
  level: number;
  title?: string;
  playerColor: 'w' | 'b';
  startFen?: string;
  uci: string[];
  evals?: PositionEval[];
  accuracy?: number;
}

export interface FinishedGame extends StoredGame {
  fens: string[]; // start position plus one entry per move
  san: string[];
  moves: MoveRef[];
}

let last: FinishedGame | null = null;

async function readAll(): Promise<StoredGame[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function rebuild(g: StoredGame): FinishedGame {
  const c = new Chess(g.startFen ?? DEFAULT_POSITION);
  const fens = [c.fen()];
  const san: string[] = [];
  const moves: MoveRef[] = [];
  for (const u of g.uci) {
    const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    fens.push(c.fen());
    san.push(m.san);
    moves.push({ from: m.from, to: m.to, promotion: m.promotion });
  }
  return { ...g, fens, san, moves };
}

/** Saves a finished game for review, and returns its id for opening the review screen. */
export function recordGame(c: Chess, info: Omit<StoredGame, 'id' | 'date' | 'uci' | 'startFen'>, startFen: string): string {
  const uci = c.history({ verbose: true }).map((m) => m.from + m.to + (m.promotion ?? ''));
  const stored: StoredGame = {
    ...info,
    id: String(Date.now()),
    date: Date.now(),
    uci,
    startFen: startFen === DEFAULT_POSITION ? undefined : startFen,
  };
  last = rebuild(stored);
  if (uci.length > 0) {
    readAll().then((all) => AsyncStorage.setItem(HISTORY_KEY, JSON.stringify([stored, ...all].slice(0, MAX_GAMES)))).catch(() => {});
  }
  return stored.id;
}

export const loadGames = readAll;

export async function getGame(id?: string): Promise<FinishedGame | null> {
  if (last && (!id || last.id === id)) return last;
  if (!id) return null;
  const found = (await readAll()).find((g) => g.id === id);
  if (!found) return null;
  last = rebuild(found);
  return last;
}

/** Keeps the analysis, so reopening a game is instant and the game list can show accuracy. */
export function saveAnalysis(id: string, evals: PositionEval[], accuracy: number | null) {
  readAll()
    .then((all) => {
      const next = all.map((g) => (g.id === id ? { ...g, evals, accuracy: accuracy ?? undefined } : g));
      return AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    })
    .catch(() => {});
  if (last?.id === id) {
    last.evals = evals;
    last.accuracy = accuracy ?? undefined;
  }
}
