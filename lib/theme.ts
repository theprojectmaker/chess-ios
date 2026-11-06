import { StyleSheet } from 'react-native';

export type AppThemeId = 'buddy' | 'club';
export type PieceStyle = 'chunky' | 'flat';

const BUDDY = {
  page: '#FFFFFF',
  card: '#FFFFFF',
  ink: '#22303C',
  muted: '#6C7D8C',
  faint: '#A9B6C2',
  line: '#E3E9EF',
  lineLip: '#CFD8E1',
  wash: '#F3F6F9',
  solid: '#34424F',
  solidLip: '#1C2630',

  leaf: '#58B92E',
  leafLip: '#3F921B',
  leafWash: '#E8F7DE',
  sky: '#2FA8F0',
  skyLip: '#1C85C7',
  skyWash: '#E2F3FE',
  sun: '#FFC21A',
  sunLip: '#DE9A00',
  sunWash: '#FFF5D6',
  coral: '#FF5C5C',
  coralLip: '#D93A3F',
  coralWash: '#FFE8E8',
  grape: '#A667F0',
  grapeLip: '#8247CC',
  flame: '#FF8A1F',
};

const CLUB: typeof BUDDY = {
  page: '#312E2B',
  card: '#3C3936',
  ink: '#FFFFFF',
  muted: '#BAB8B5',
  faint: '#8D8B88',
  line: '#46433F',
  lineLip: '#262421',
  wash: '#2A2826',
  solid: '#5D8A33',
  solidLip: '#456A25',

  leaf: '#81B64C',
  leafLip: '#5D8A33',
  leafWash: '#3B4A2B',
  sky: '#5FA8E8',
  skyLip: '#3F7FB8',
  skyWash: '#2C3D4C',
  sun: '#F2B134',
  sunLip: '#C48A1C',
  sunWash: '#4A3F25',
  coral: '#E8605A',
  coralLip: '#B8403C',
  coralWash: '#4C2F2D',
  grape: '#A98BE0',
  grapeLip: '#7F63B8',
  flame: '#F0923C',
};

export const colors = { ...BUDDY };

export const fonts = {
  display: 'Fredoka_600SemiBold',
  displayBold: 'Fredoka_700Bold',
  body: 'Nunito_600SemiBold',
  bold: 'Nunito_800ExtraBold',
};

export const shape = { button: 16, card: 18, boardRadius: 10 };

export const MAX_CONTENT = 560;

export interface BoardStyle {
  id: string;
  name: string;
  light: string;
  dark: string;
  plinth: string | null; // null draws the flat board with no raised base
  plinthLip: string;
}

export const BOARD_STYLES: BoardStyle[] = [
  { id: 'buddy', name: 'Buddy', light: '#EFF3D9', dark: '#7BAA5C', plinth: '#4F7C38', plinthLip: '#37592A' },
  { id: 'club', name: 'Club Green', light: '#EBECD0', dark: '#779556', plinth: null, plinthLip: '#000000' },
  { id: 'wood', name: 'Wood', light: '#F0D9B5', dark: '#B58863', plinth: '#7A5230', plinthLip: '#54371E' },
  { id: 'walnut', name: 'Walnut', light: '#D8B98F', dark: '#8A5A3C', plinth: null, plinthLip: '#000000' },
  { id: 'ice', name: 'Ice', light: '#DEE3E6', dark: '#8CA2AD', plinth: '#5C7480', plinthLip: '#3F525C' },
  { id: 'ocean', name: 'Ocean', light: '#E8EDF9', dark: '#6F8FC9', plinth: '#3F5F9C', plinthLip: '#2A4475' },
  { id: 'grape', name: 'Grape', light: '#EFE9F7', dark: '#8E73B8', plinth: '#634A8C', plinthLip: '#463265' },
  { id: 'night', name: 'Night', light: '#8D98A6', dark: '#46505C', plinth: null, plinthLip: '#000000' },
];

export const boardPrefs = {
  board: BOARD_STYLES[0],
  pieces: 'chunky' as PieceStyle,
  showHints: true,
  showCoords: true,
  autoQueen: false,
};

let activeTheme: AppThemeId = 'buddy';
let themeVersion = 0;

export const isDarkTheme = () => activeTheme === 'club';
export const appTheme = () => activeTheme;

/** A soft tint of a label color that stays readable on either theme's background. */
export const labelWash = (info: { color: string; wash: string }) => (activeTheme === 'club' ? `${info.color}33` : info.wash);

const listeners = new Set<() => void>();
export function onThemeChange(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function applyTheme(id: AppThemeId) {
  activeTheme = id;
  themeVersion++;
  Object.assign(colors, id === 'club' ? CLUB : BUDDY);
  Object.assign(fonts, id === 'club'
    ? { display: 'Nunito_800ExtraBold', displayBold: 'Nunito_800ExtraBold' }
    : { display: 'Fredoka_600SemiBold', displayBold: 'Fredoka_700Bold' });
  Object.assign(shape, id === 'club' ? { button: 8, card: 10, boardRadius: 3 } : { button: 16, card: 18, boardRadius: 10 });
  listeners.forEach((fn) => fn());
}

export function applyBoardPrefs(p: { boardStyle?: string; pieceStyle?: PieceStyle; showHints?: boolean; showCoords?: boolean; autoQueen?: boolean }) {
  boardPrefs.board = BOARD_STYLES.find((b) => b.id === p.boardStyle) ?? BOARD_STYLES[0];
  boardPrefs.pieces = p.pieceStyle ?? 'chunky';
  boardPrefs.showHints = p.showHints ?? true;
  boardPrefs.showCoords = p.showCoords ?? true;
  boardPrefs.autoQueen = p.autoQueen ?? false;
}

/**
 * StyleSheet.create fixes its values at import time, which would freeze the first theme. This builds
 * each file's styles on first use per theme, so colors from the active theme land in every screen.
 */
export function themed<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(make: () => T & StyleSheet.NamedStyles<any>): T {
  let built: T | null = null;
  let builtFor = -1;
  return new Proxy({} as object, {
    get(_, key) {
      if (!built || builtFor !== themeVersion) {
        built = StyleSheet.create(make()) as T;
        builtFor = themeVersion;
      }
      return (built as Record<string | symbol, unknown>)[key];
    },
  }) as T;
}
