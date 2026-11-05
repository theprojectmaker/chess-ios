import type { Progress } from './storage';

export interface Achievement {
  id: string;
  name: string;
  about: string;
  got: (p: Progress) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-solve', name: 'First find', about: 'Solve a puzzle', got: (p) => p.puzzlesSolved >= 1 },
  { id: 'solve-50', name: 'Puzzle fan', about: 'Solve 50 puzzles', got: (p) => p.puzzlesSolved >= 50 },
  { id: 'solve-150', name: 'Tactics machine', about: 'Solve 150 puzzles', got: (p) => p.puzzlesSolved >= 150 },
  { id: 'combo-5', name: 'On a roll', about: '5 puzzles in a row, no mistakes', got: (p) => p.bestCombo >= 5 },
  { id: 'combo-10', name: 'Unstoppable', about: '10 puzzles in a row, no mistakes', got: (p) => p.bestCombo >= 10 },
  { id: 'rush-10', name: 'Speed demon', about: 'Score 10 in Puzzle Rush', got: (p) => p.rushBest >= 10 },
  { id: 'rush-25', name: 'Rush master', about: 'Score 25 in Puzzle Rush', got: (p) => p.rushBest >= 25 },
  { id: 'first-win', name: 'First blood', about: 'Beat any bot', got: (p) => p.gamesWon >= 1 },
  { id: 'beat-4', name: 'Halfway up', about: 'Beat 4 different bots', got: (p) => Object.keys(p.botsBeaten).length >= 4 },
  { id: 'beat-8', name: 'Top of the ladder', about: 'Beat all 8 bots', got: (p) => Object.keys(p.botsBeaten).length >= 8 },
  { id: 'brilliant', name: 'Brilliant!!', about: 'Play a brilliant move', got: (p) => p.brilliants >= 1 },
  { id: 'great-10', name: 'Sharp eyes', about: 'Find 10 great moves', got: (p) => p.greats >= 10 },
  { id: 'sprint-20', name: 'Board vision', about: 'Find 20 squares in Square Sprint', got: (p) => p.sprintBest >= 20 },
  { id: 'gauntlet-4', name: 'Gauntlet runner', about: 'Reach bot 4 in the Gauntlet', got: (p) => p.gauntletBest >= 4 },
  { id: 'gauntlet-8', name: 'Gauntlet champion', about: 'Beat all 8 bots in one run', got: (p) => p.gauntletBest >= 8 },
  { id: 'endgame-all', name: 'Endgame expert', about: 'Win all 6 endgame drills', got: (p) => Object.keys(p.endgamesDone).length >= 6 },
  { id: 'streak-3', name: 'Warming up', about: '3 day streak', got: (p) => p.longestStreak >= 3 },
  { id: 'streak-7', name: 'Week of chess', about: '7 day streak', got: (p) => p.longestStreak >= 7 },
  { id: 'streak-30', name: 'Devoted', about: '30 day streak', got: (p) => p.longestStreak >= 30 },
  { id: 'daily-7', name: 'Daily regular', about: 'Solve 7 daily puzzles', got: (p) => p.dailySolved >= 7 },
];
