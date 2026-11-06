import AsyncStorage from '@react-native-async-storage/async-storage';
import { ACHIEVEMENTS } from './achievements';
import { bandFor, START_RATING } from './elo';
import { showToast } from './toast';

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
  teacher: string;
  coachOn: boolean;
  brilliants: number;
  greats: number;
  bestCombo: number;
  dailySolved: number;
  lastDaily: string | null;
  earned: string[];
  soundStyle: 'wood' | 'soft' | 'arcade';
  blitzBest: number;
  sprintBest: number;
  gauntletBest: number;
  endgamesDone: Record<string, boolean>;
  rating: number;
  ratingSet: boolean;
  ratingPeak: number;
  ratedGames: number;
  ratingHistory: number[];
  puzzleRating: number;
  ratedPuzzles: number;
  appTheme: 'buddy' | 'club';
  boardStyle: string;
  pieceStyle: 'chunky' | 'flat';
  showHints: boolean;
  showCoords: boolean;
  autoQueen: boolean;
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
  teacher: 'poppy',
  coachOn: true,
  brilliants: 0,
  greats: 0,
  bestCombo: 0,
  dailySolved: 0,
  lastDaily: null,
  earned: [],
  soundStyle: 'wood',
  blitzBest: 0,
  sprintBest: 0,
  gauntletBest: 0,
  endgamesDone: {},
  rating: START_RATING,
  ratingSet: false,
  ratingPeak: START_RATING,
  ratedGames: 0,
  ratingHistory: [],
  puzzleRating: START_RATING,
  ratedPuzzles: 0,
  appTheme: 'buddy',
  boardStyle: 'buddy',
  pieceStyle: 'chunky',
  showHints: true,
  showCoords: true,
  autoQueen: false,
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
    const prior = await loadProgress();
    const next = change(prior);
    const fresh = ACHIEVEMENTS.filter((a) => !next.earned.includes(a.id) && a.got(next));
    if (fresh.length) next.earned = [...next.earned, ...fresh.map((a) => a.id)];
    for (const a of fresh) showToast('New badge', a.name);
    const level = (xp: number) => Math.floor(xp / XP_PER_LEVEL) + 1;
    if (level(next.xp) > level(prior.xp)) showToast('Level up', `You reached level ${level(next.xp)}`);
    if (prior.ratingSet && bandFor(next.rating).from > bandFor(prior.rating).from) showToast('New rank', `${bandFor(next.rating).name}: ${next.rating} Elo`);
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

/** Applies a rated game result, keeping the peak and a short history for the graph. */
export function withRating(p: Progress, rating: number): Progress {
  return { ...p, rating, ratingPeak: Math.max(p.ratingPeak, rating), ratedGames: p.ratedGames + 1, ratingHistory: [...p.ratingHistory, rating].slice(-40) };
}

export const resetProgress = () =>
  updateProgress((p) => ({ ...DEFAULT_PROGRESS, sound: p.sound }));

export interface SavedGame {
  level: number;
  playerColor: 'w' | 'b';
  moves: string[];
  hintsLeft: number;
  startFen?: string;
  minutes?: number;
  clocks?: { w: number; b: number };
  mode?: 'standard' | 'shuffle' | 'odds';
  endgame?: string;
  gauntlet?: boolean;
  assisted?: boolean;
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

const LOCAL_KEY = 'chess-local-game-v1';
export interface SavedLocalGame {
  moves: string[];
  autoFlip: boolean;
}
export async function loadLocalGame(): Promise<SavedLocalGame | null> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export const saveLocalGame = (game: SavedLocalGame) => AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(game)).catch(() => {});
export const clearLocalGame = () => AsyncStorage.removeItem(LOCAL_KEY).catch(() => {});
