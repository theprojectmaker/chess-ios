// The standard Elo formulas used by chess federations, plus names for each rating band.
export const START_RATING = 400;
export const MIN_RATING = 100;
const PROVISIONAL_GAMES = 20;

export function expectedScore(mine: number, theirs: number): number {
  return 1 / (1 + Math.pow(10, (theirs - mine) / 400));
}

/** New players move fast until the rating settles, then K drops, as with real rating systems. */
export function newRating(mine: number, theirs: number, score: 0 | 0.5 | 1, gamesPlayed: number): number {
  const k = gamesPlayed < PROVISIONAL_GAMES ? 40 : mine >= 2000 ? 10 : 20;
  return Math.max(MIN_RATING, Math.round(mine + k * (score - expectedScore(mine, theirs))));
}

export interface Band {
  name: string;
  from: number;
  color: string;
}

export const BANDS: Band[] = [
  { name: 'Newcomer', from: 0, color: '#8BCF5A' },
  { name: 'Beginner', from: 400, color: '#58B92E' },
  { name: 'Learner', from: 700, color: '#2FB5A8' },
  { name: 'Club Player', from: 1000, color: '#2FA8F0' },
  { name: 'Strong Club', from: 1300, color: '#5B7FF0' },
  { name: 'Expert', from: 1600, color: '#A667F0' },
  { name: 'Candidate', from: 1900, color: '#F064A8' },
  { name: 'Master Level', from: 2200, color: '#FF8A1F' },
  { name: 'Elite', from: 2500, color: '#E5383B' },
];

export function bandFor(rating: number): Band {
  let band = BANDS[0];
  for (const b of BANDS) if (rating >= b.from) band = b;
  return band;
}

export function nextBand(rating: number): Band | null {
  return BANDS.find((b) => b.from > rating) ?? null;
}

/** Up, down and even outcomes for the pre-game screen. */
export function ratingStakes(mine: number, theirs: number, gamesPlayed: number) {
  return {
    win: newRating(mine, theirs, 1, gamesPlayed) - mine,
    draw: newRating(mine, theirs, 0.5, gamesPlayed) - mine,
    loss: newRating(mine, theirs, 0, gamesPlayed) - mine,
  };
}
