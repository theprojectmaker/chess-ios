import AsyncStorage from '@react-native-async-storage/async-storage';

const PROGRESS_KEY = 'chess-progress-v2';
const GAME_KEY = 'chess-current-game-v2';

export const DAILY_GOAL = 30;
export const XP_PER_LEVEL = 150;

export interface Progress {
  streak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  activeDays: string[];
  xp: number;
  dailyXp: number;
  dailyDate: string | null;
  lessonsDone: Record<string, number>; // lesson id -> best accuracy, 0..100
  botsPlayed: Record<string, boolean>;
  botsBeaten: Record<string, boolean>;
  gamesPlayed: number;
  gamesWon: number;
  gamesDrawn: number;
  gamesLost: number;
  puzzlesSolved: number;
  rushBest: number;
  sound: boolean;
}

export const DEFAULT_PROGRESS: Progress = {
  streak: 0,
  longestStreak: 0,
  lastActiveDate: null,
  activeDays: [],
  xp: 0,
  dailyXp: 0,
  dailyDate: null,
  lessonsDone: {},
  botsPlayed: {},
  botsBeaten: {},
  gamesPlayed: 0,
  gamesWon: 0,
  gamesDrawn: 0,
  gamesLost: 0,
  puzzlesSolved: 0,
  rushBest: 0,
  sound: true,
};

// Local calendar day: a UTC date would roll the streak over in the middle of the evening.
export function dayKey(date = new Date()): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

function previousDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - 1));
}

export async function loadProgress(): Promise<Progress> {
  try {
    const raw = await AsyncStorage.getItem(PROGRESS_KEY);
    const stored: Progress = raw ? { ...DEFAULT_PROGRESS, ...JSON.parse(raw) } : { ...DEFAULT_PROGRESS };
    const today = dayKey();
    if (stored.dailyDate !== today) stored.dailyXp = 0;
    if (stored.lastActiveDate && stored.lastActiveDate !== today && stored.lastActiveDate !== previousDay(today)) stored.streak = 0;
    return stored;
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

let queue: Promise<unknown> = Promise.resolve();

/** Writes run one at a time, so two quick updates can't overwrite each other. */
export function updateProgress(change: (p: Progress) => Progress): Promise<Progress> {
  const run = queue.then(async () => {
    const next = change(await loadProgress());
    await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(next)).catch(() => {});
    return next;
  });
  queue = run.catch(() => {});
  return run;
}

/** Practice today: keeps the streak alive, and counts XP toward the daily goal. */
export function earn(p: Progress, xp: number): Progress {
  const today = dayKey();
  const next = { ...p, xp: p.xp + xp };
  next.dailyXp = (p.dailyDate === today ? p.dailyXp : 0) + xp;
  next.dailyDate = today;
  if (p.lastActiveDate !== today) {
    next.streak = p.lastActiveDate === previousDay(today) ? p.streak + 1 : 1;
    next.longestStreak = Math.max(p.longestStreak, next.streak);
    next.lastActiveDate = today;
    next.activeDays = [...p.activeDays.filter((d) => d !== today), today].slice(-30);
  }
  return next;
}

export const resetProgress = () =>
  updateProgress((p) => ({ ...DEFAULT_PROGRESS, sound: p.sound }));

export interface SavedGame {
  level: number;
  playerColor: 'w' | 'b';
  moves: string[];
  hintsLeft: number;
}

export async function loadSavedGame(): Promise<SavedGame | null> {
  try {
    const raw = await AsyncStorage.getItem(GAME_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export const saveGame = (game: SavedGame) => AsyncStorage.setItem(GAME_KEY, JSON.stringify(game)).catch(() => {});
export const clearSavedGame = () => AsyncStorage.removeItem(GAME_KEY).catch(() => {});
