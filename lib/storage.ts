import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'chess-progress-v1';

export interface Progress {
  streak: number;
  longestStreak: number;
  lastPlayedDate: string | null; // yyyy-mm-dd
  puzzlesSolved: string[];
  gamesPlayed: number;
  gamesWon: number;
  gamesDrawn: number;
  gamesLost: number;
  xp: number;
}

export const DEFAULT_PROGRESS: Progress = {
  streak: 0,
  longestStreak: 0,
  lastPlayedDate: null,
  puzzlesSolved: [],
  gamesPlayed: 0,
  gamesWon: 0,
  gamesDrawn: 0,
  gamesLost: 0,
  xp: 0,
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / msPerDay);
}

export async function loadProgress(): Promise<Progress> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PROGRESS, ...parsed };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

async function saveProgress(progress: Progress): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // ignore persistence failures — the app still works for this session
  }
}

/** Bumps the daily streak at most once per calendar day. */
function bumpStreak(progress: Progress): Progress {
  const today = todayKey();
  if (progress.lastPlayedDate === today) return progress;
  let streak = 1;
  if (progress.lastPlayedDate) {
    const gap = daysBetween(progress.lastPlayedDate, today);
    streak = gap === 1 ? progress.streak + 1 : 1;
  }
  return {
    ...progress,
    streak,
    longestStreak: Math.max(progress.longestStreak, streak),
    lastPlayedDate: today,
  };
}

export async function recordPuzzleSolved(puzzleId: string, xpGain = 10): Promise<Progress> {
  const current = await loadProgress();
  let next = bumpStreak(current);
  if (!next.puzzlesSolved.includes(puzzleId)) {
    next = { ...next, puzzlesSolved: [...next.puzzlesSolved, puzzleId], xp: next.xp + xpGain };
  }
  await saveProgress(next);
  return next;
}

export async function recordGameResult(result: 'win' | 'loss' | 'draw', xpGain: number): Promise<Progress> {
  const current = await loadProgress();
  let next = bumpStreak(current);
  next = {
    ...next,
    gamesPlayed: next.gamesPlayed + 1,
    gamesWon: next.gamesWon + (result === 'win' ? 1 : 0),
    gamesLost: next.gamesLost + (result === 'loss' ? 1 : 0),
    gamesDrawn: next.gamesDrawn + (result === 'draw' ? 1 : 0),
    xp: next.xp + xpGain,
  };
  await saveProgress(next);
  return next;
}
