import type { Move } from 'chess.js';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { SOUND_FILES } from './soundFiles';

export type SoundStyle = keyof typeof SOUND_FILES;
export type SoundName = keyof (typeof SOUND_FILES)['wood'];

export const SOUND_STYLES: { id: SoundStyle; name: string; about: string }[] = [
  { id: 'wood', name: 'Wooden board', about: 'Clicks and marimba' },
  { id: 'soft', name: 'Soft pops', about: 'Rounded and gentle' },
  { id: 'arcade', name: 'Arcade', about: 'Retro game blips' },
];

let enabled = true;
let style: SoundStyle = 'wood';
const players: Partial<Record<string, AudioPlayer>> = {};

function playerFor(name: SoundName): AudioPlayer {
  const key = `${style}/${name}`;
  return (players[key] ??= createAudioPlayer(SOUND_FILES[style][name]));
}

/** Loads the whole set up front. Loading on first use made the first of each sound arrive late. */
export function prepareSounds() {
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
  try {
    (Object.keys(SOUND_FILES[style]) as SoundName[]).forEach(playerFor);
  } catch {
    // Sounds are optional: playback falls back to loading on demand.
  }
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

export function setSoundStyle(next: SoundStyle) {
  style = SOUND_FILES[next] ? next : 'wood';
  prepareSounds();
}

export function play(name: SoundName) {
  if (!enabled) return;
  try {
    const player = playerFor(name);
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
