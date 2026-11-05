import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import type { Move } from 'chess.js';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const SOURCES = {
  move: require('../assets/sounds/move.wav'),
  capture: require('../assets/sounds/capture.wav'),
  check: require('../assets/sounds/check.wav'),
  correct: require('../assets/sounds/correct.wav'),
  wrong: require('../assets/sounds/wrong.wav'),
  win: require('../assets/sounds/win.wav'),
  lose: require('../assets/sounds/lose.wav'),
  castle: require('../assets/sounds/castle.wav'),
  promote: require('../assets/sounds/promote.wav'),
  start: require('../assets/sounds/start.wav'),
  combo: require('../assets/sounds/combo.wav'),
  brilliant: require('../assets/sounds/brilliant.wav'),
  great: require('../assets/sounds/great.wav'),
  blunder: require('../assets/sounds/blunder.wav'),
  inaccuracy: require('../assets/sounds/inaccuracy.wav'),
  levelup: require('../assets/sounds/levelup.wav'),
};
export type SoundName = keyof typeof SOURCES;

const players: Partial<Record<SoundName, AudioPlayer>> = {};
let enabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

export function play(name: SoundName) {
  if (!enabled) return;
  try {
    const player = (players[name] ??= createAudioPlayer(SOURCES[name]));
    player.seekTo(0);
    player.play();
  } catch {
    // A missing sound must never interrupt a game.
  }
}

export function playMove(made: Move, inCheck: boolean) {
  if (inCheck) play('check');
  else if (made.promotion) play('promote');
  else if (made.flags.includes('k') || made.flags.includes('q')) play('castle');
  else if (made.captured) play('capture');
  else play('move');
}

export function haptic(kind: 'light' | 'medium' | 'success' | 'error') {
  if (Platform.OS === 'web') return;
  const run =
    kind === 'success' ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    : kind === 'error' ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    : Haptics.impactAsync(kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
  run.catch(() => {});
}
