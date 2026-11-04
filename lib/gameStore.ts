export interface GameReviewData {
  result: 'win' | 'loss' | 'draw';
  reason: string;
  moves: string[]; // SAN history
  playerColor: 'w' | 'b';
  botName: string;
}

let lastReview: GameReviewData | null = null;

export function setLastReview(data: GameReviewData) {
  lastReview = data;
}

export function getLastReview(): GameReviewData | null {
  return lastReview;
}
