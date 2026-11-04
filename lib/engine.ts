// Standalone 0x88 chess engine. chess.js stays the source of truth for game rules in the UI;
// it is far too slow to search with, so this file has its own move generator and search.
// Square numbering: rank * 16 + file, with rank 0 = rank 1.

const PAWN = 1, KNIGHT = 2, BISHOP = 3, ROOK = 4, QUEEN = 5, KING = 6;
const BLACK_BIT = 8;
const FLAG_EP = 1, FLAG_CASTLE = 2, FLAG_DOUBLE = 3;
const WK = 1, WQ = 2, BK = 4, BQ = 8;

export const MATE = 30000;
const MATE_BOUND = MATE - 1000;
const INF = 32000;
const MAX_PLY = 96;
const HIST_SIZE = 4096;
const TT_BITS = 17;
const TT_SIZE = 1 << TT_BITS;
const TT_EXACT = 1, TT_LOWER = 2, TT_UPPER = 3;

const KNIGHT_OFFSETS = [31, 33, 14, 18, -31, -33, -14, -18];
const KING_OFFSETS = [1, -1, 16, -16, 15, 17, -15, -17];
const ROOK_DIRS = [1, -1, 16, -16];
const BISHOP_DIRS = [15, 17, -15, -17];
const VALUE_MG = [0, 82, 337, 365, 477, 1025, 0];
const VALUE_EG = [0, 94, 281, 297, 512, 936, 0];
const SEE_VALUE = [0, 100, 320, 330, 500, 900, 20000];
const PHASE_WEIGHT = [0, 0, 1, 1, 2, 4, 0];

// Tables read from rank 8 down to rank 1, from White's point of view.
const T_PAWN = [
  0, 0, 0, 0, 0, 0, 0, 0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5, 5, 10, 25, 25, 10, 5, 5,
  0, 0, 0, 20, 20, 0, 0, 0,
  5, -5, -10, 0, 0, -10, -5, 5,
  5, 10, 10, -20, -20, 10, 10, 5,
  0, 0, 0, 0, 0, 0, 0, 0,
];
const T_PAWN_EG = [
  0, 0, 0, 0, 0, 0, 0, 0,
  80, 80, 80, 80, 80, 80, 80, 80,
  50, 50, 50, 50, 50, 50, 50, 50,
  30, 30, 30, 30, 30, 30, 30, 30,
  15, 15, 15, 15, 15, 15, 15, 15,
  5, 5, 5, 5, 5, 5, 5, 5,
  5, 5, 5, 5, 5, 5, 5, 5,
  0, 0, 0, 0, 0, 0, 0, 0,
];
const T_KNIGHT = [
  -50, -40, -30, -30, -30, -30, -40, -50,
  -40, -20, 0, 0, 0, 0, -20, -40,
  -30, 0, 10, 15, 15, 10, 0, -30,
  -30, 5, 15, 20, 20, 15, 5, -30,
  -30, 0, 15, 20, 20, 15, 0, -30,
  -30, 5, 10, 15, 15, 10, 5, -30,
  -40, -20, 0, 5, 5, 0, -20, -40,
  -50, -40, -30, -30, -30, -30, -40, -50,
];
const T_BISHOP = [
  -20, -10, -10, -10, -10, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 10, 10, 5, 0, -10,
  -10, 5, 5, 10, 10, 5, 5, -10,
  -10, 0, 10, 10, 10, 10, 0, -10,
  -10, 10, 10, 10, 10, 10, 10, -10,
  -10, 5, 0, 0, 0, 0, 5, -10,
  -20, -10, -10, -10, -10, -10, -10, -20,
];
const T_ROOK = [
  0, 0, 0, 0, 0, 0, 0, 0,
  5, 10, 10, 10, 10, 10, 10, 5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  0, 0, 0, 5, 5, 0, 0, 0,
];
const T_QUEEN = [
  -20, -10, -10, -5, -5, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 5, 5, 5, 0, -10,
  -5, 0, 5, 5, 5, 5, 0, -5,
  0, 0, 5, 5, 5, 5, 0, -5,
  -10, 5, 5, 5, 5, 5, 0, -10,
  -10, 0, 5, 0, 0, 0, 0, -10,
  -20, -10, -10, -5, -5, -10, -10, -20,
];
const T_KING_MG = [
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -20, -30, -30, -40, -40, -30, -30, -20,
  -10, -20, -20, -20, -20, -20, -20, -10,
  20, 20, 0, 0, 0, 0, 20, 20,
  20, 30, 10, 0, 0, 10, 30, 20,
];
const T_KING_EG = [
  -50, -40, -30, -20, -20, -30, -40, -50,
  -30, -20, -10, 0, 0, -10, -20, -30,
  -30, -10, 20, 30, 30, 20, -10, -30,
  -30, -10, 30, 40, 40, 30, -10, -30,
  -30, -10, 30, 40, 40, 30, -10, -30,
  -30, -10, 20, 30, 30, 20, -10, -30,
  -30, -30, 0, 0, 0, 0, -30, -30,
  -50, -30, -30, -30, -30, -30, -30, -50,
];
const TABLES_MG = [[], T_PAWN, T_KNIGHT, T_BISHOP, T_ROOK, T_QUEEN, T_KING_MG];
const TABLES_EG = [[], T_PAWN_EG, T_KNIGHT, T_BISHOP, T_ROOK, T_QUEEN, T_KING_EG];
const PASSED_BONUS = [0, 5, 10, 20, 35, 60, 100, 0];

const PST_MG: Int16Array[] = [];
const PST_EG: Int16Array[] = [];
const Z_PIECE_LO: Int32Array[] = [];
const Z_PIECE_HI: Int32Array[] = [];
const Z_CASTLE_LO = new Int32Array(16);
const Z_CASTLE_HI = new Int32Array(16);
const Z_EP_LO = new Int32Array(8);
const Z_EP_HI = new Int32Array(8);
let Z_SIDE_LO = 0;
let Z_SIDE_HI = 0;
const CASTLE_MASK = new Uint8Array(128).fill(15);

(function initTables() {
  let seed = 0x2f6e2b1;
  const rnd = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return seed | 0;
  };
  for (let p = 0; p < 15; p++) {
    PST_MG.push(new Int16Array(128));
    PST_EG.push(new Int16Array(128));
    const lo = new Int32Array(128);
    const hi = new Int32Array(128);
    for (let s = 0; s < 128; s++) {
      lo[s] = rnd();
      hi[s] = rnd();
    }
    Z_PIECE_LO.push(lo);
    Z_PIECE_HI.push(hi);
    const type = p & 7;
    if (type < 1 || type > 6) continue;
    const isBlack = p >> 3 === 1;
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const s = r * 16 + f;
        const idx = isBlack ? r * 8 + f : (7 - r) * 8 + f;
        const mg = VALUE_MG[type] + TABLES_MG[type][idx];
        const eg = VALUE_EG[type] + TABLES_EG[type][idx];
        PST_MG[p][s] = isBlack ? -mg : mg;
        PST_EG[p][s] = isBlack ? -eg : eg;
      }
    }
  }
  for (let i = 0; i < 16; i++) {
    Z_CASTLE_LO[i] = rnd();
    Z_CASTLE_HI[i] = rnd();
  }
  for (let i = 0; i < 8; i++) {
    Z_EP_LO[i] = rnd();
    Z_EP_HI[i] = rnd();
  }
  Z_SIDE_LO = rnd();
  Z_SIDE_HI = rnd();
  CASTLE_MASK[0] = 15 ^ WQ;
  CASTLE_MASK[7] = 15 ^ WK;
  CASTLE_MASK[4] = 15 ^ (WK | WQ);
  CASTLE_MASK[112] = 15 ^ BQ;
  CASTLE_MASK[119] = 15 ^ BK;
  CASTLE_MASK[116] = 15 ^ (BK | BQ);
})();

const mFrom = (m: number) => m & 127;
const mTo = (m: number) => (m >> 7) & 127;
const mPromo = (m: number) => (m >> 14) & 7;
const mCap = (m: number) => (m >> 18) & 15;
const mFlag = (m: number) => (m >> 23) & 3;
const encode = (from: number, to: number, promo: number, cap: number, flag: number) =>
  from | (to << 7) | (promo << 14) | (cap << 18) | (flag << 23);

export function sqName(s: number): string {
  return 'abcdefgh'[s & 7] + String((s >> 4) + 1);
}
function nameToSq(n: string): number {
  return (n.charCodeAt(1) - 49) * 16 + (n.charCodeAt(0) - 97);
}

export interface EngineMove {
  from: string;
  to: string;
  promotion?: 'q' | 'r' | 'b' | 'n';
}
export interface ScoredMove extends EngineMove {
  score: number;
}
export interface ThinkOptions {
  maxDepth: number;
  timeMs: number;
  margin?: number; // moves this many centipawns below best may be picked at random
  blunderChance?: number; // chance of widening the choice to blunderMargin
  blunderMargin?: number;
  random?: () => number;
}
export interface ThinkResult {
  move: EngineMove | null;
  best: EngineMove | null;
  score: number; // centipawns from the side to move's point of view
  depth: number;
  nodes: number;
  lines: ScoredMove[];
}

const PROMO_CHARS = ['', '', 'n', 'b', 'r', 'q'];

function toEngineMove(m: number): EngineMove {
  const out: EngineMove = { from: sqName(mFrom(m)), to: sqName(mTo(m)) };
  const promo = mPromo(m);
  if (promo) out.promotion = PROMO_CHARS[promo] as EngineMove['promotion'];
  return out;
}

export class Engine {
  board = new Uint8Array(128);
  side = 0;
  castle = 0;
  ep = -1;
  half = 0;
  mg = 0;
  eg = 0;
  phase = 0;
  lo = 0;
  hi = 0;
  hply = 0;
  kingSq = new Int16Array(2);
  plist = new Int16Array(32);
  pcount = new Int32Array(2);
  pindex = new Int16Array(128);
  counts = new Int16Array(15);

  uCastle = new Uint8Array(HIST_SIZE);
  uEp = new Int16Array(HIST_SIZE);
  uHalf = new Int16Array(HIST_SIZE);
  histLo = new Int32Array(HIST_SIZE);
  histHi = new Int32Array(HIST_SIZE);

  moveBuf = new Int32Array(256 * (MAX_PLY + 8));
  scoreBuf = new Int32Array(256 * (MAX_PLY + 8));
  killers = new Int32Array((MAX_PLY + 8) * 2);
  history = new Int32Array(128 * 128);

  ttLo = new Int32Array(TT_SIZE);
  ttHi = new Int32Array(TT_SIZE);
  ttMove = new Int32Array(TT_SIZE);
  ttScore = new Int16Array(TT_SIZE);
  ttDepth = new Int8Array(TT_SIZE);
  ttFlag = new Int8Array(TT_SIZE);

  nodes = 0;
  deadline = 0;
  stopped = false;
  cancelled = false;

  private clear() {
    this.board.fill(0);
    this.pcount.fill(0);
    this.counts.fill(0);
    this.mg = this.eg = this.phase = 0;
    this.lo = this.hi = 0;
    this.half = 0;
    this.ep = -1;
    this.castle = 0;
    this.side = 0;
    this.hply = 0;
  }

  private add(s: number, p: number) {
    const c = p >> 3;
    this.board[s] = p;
    const i = this.pcount[c]++;
    this.plist[c * 16 + i] = s;
    this.pindex[s] = i;
    this.mg += PST_MG[p][s];
    this.eg += PST_EG[p][s];
    this.phase += PHASE_WEIGHT[p & 7];
    this.counts[p]++;
    this.lo ^= Z_PIECE_LO[p][s];
    this.hi ^= Z_PIECE_HI[p][s];
    if ((p & 7) === KING) this.kingSq[c] = s;
  }

  private remove(s: number) {
    const p = this.board[s];
    const c = p >> 3;
    const i = this.pindex[s];
    const last = this.plist[c * 16 + --this.pcount[c]];
    this.plist[c * 16 + i] = last;
    this.pindex[last] = i;
    this.board[s] = 0;
    this.mg -= PST_MG[p][s];
    this.eg -= PST_EG[p][s];
    this.phase -= PHASE_WEIGHT[p & 7];
    this.counts[p]--;
    this.lo ^= Z_PIECE_LO[p][s];
    this.hi ^= Z_PIECE_HI[p][s];
  }

  private parse(fen: string) {
    this.clear();
    const [placement, turn, castling, ep, half] = fen.trim().split(/\s+/);
    let r = 7;
    let f = 0;
    for (const ch of placement) {
      if (ch === '/') {
        r--;
        f = 0;
      } else if (ch >= '1' && ch <= '8') {
        f += Number(ch);
      } else {
        const lower = ch.toLowerCase();
        const type = 'pnbrqk'.indexOf(lower) + 1;
        this.add(r * 16 + f, type | (ch === lower ? BLACK_BIT : 0));
        f++;
      }
    }
    this.side = turn === 'b' ? 1 : 0;
    if (this.side) {
      this.lo ^= Z_SIDE_LO;
      this.hi ^= Z_SIDE_HI;
    }
    if (castling && castling !== '-') {
      if (castling.includes('K')) this.castle |= WK;
      if (castling.includes('Q')) this.castle |= WQ;
      if (castling.includes('k')) this.castle |= BK;
      if (castling.includes('q')) this.castle |= BQ;
    }
    this.lo ^= Z_CASTLE_LO[this.castle];
    this.hi ^= Z_CASTLE_HI[this.castle];
    if (ep && ep !== '-') {
      this.ep = nameToSq(ep);
      this.lo ^= Z_EP_LO[this.ep & 7];
      this.hi ^= Z_EP_HI[this.ep & 7];
    }
    this.half = Number(half ?? 0) || 0;
  }

  /** Earlier positions of the same game let the search see and avoid threefold repetition. */
  setPosition(fen: string, previousFens: string[] = []) {
    const recent = previousFens.slice(-(HIST_SIZE - 512));
    for (let i = 0; i < recent.length; i++) {
      this.parse(recent[i]);
      this.histLo[i] = this.lo;
      this.histHi[i] = this.hi;
    }
    this.parse(fen);
    this.hply = recent.length;
  }

  isAttacked(s: number, by: number): boolean {
    const b = this.board;
    const color = by << 3;
    if (by === 0) {
      let t = s - 15;
      if (!(t & 0x88) && b[t] === PAWN) return true;
      t = s - 17;
      if (!(t & 0x88) && b[t] === PAWN) return true;
    } else {
      let t = s + 15;
      if (!(t & 0x88) && b[t] === (PAWN | BLACK_BIT)) return true;
      t = s + 17;
      if (!(t & 0x88) && b[t] === (PAWN | BLACK_BIT)) return true;
    }
    const knight = KNIGHT | color;
    for (let i = 0; i < 8; i++) {
      const t = s + KNIGHT_OFFSETS[i];
      if (!(t & 0x88) && b[t] === knight) return true;
    }
    const king = KING | color;
    for (let i = 0; i < 8; i++) {
      const t = s + KING_OFFSETS[i];
      if (!(t & 0x88) && b[t] === king) return true;
    }
    const rook = ROOK | color;
    const bishop = BISHOP | color;
    const queen = QUEEN | color;
    for (let i = 0; i < 4; i++) {
      const d = ROOK_DIRS[i];
      let t = s + d;
      while (!(t & 0x88)) {
        const p = b[t];
        if (p) {
          if (p === rook || p === queen) return true;
          break;
        }
        t += d;
      }
    }
    for (let i = 0; i < 4; i++) {
      const d = BISHOP_DIRS[i];
      let t = s + d;
      while (!(t & 0x88)) {
        const p = b[t];
        if (p) {
          if (p === bishop || p === queen) return true;
          break;
        }
        t += d;
      }
    }
    return false;
  }

  inCheck(): boolean {
    return this.isAttacked(this.kingSq[this.side], this.side ^ 1);
  }

  private gen(start: number, capturesOnly: boolean): number {
    const b = this.board;
    const buf = this.moveBuf;
    const us = this.side;
    const them = us ^ 1;
    let n = start;
    const count = this.pcount[us];
    const base = us * 16;
    for (let i = 0; i < count; i++) {
      const from = this.plist[base + i];
      const type = b[from] & 7;
      if (type === PAWN) {
        const dir = us === 0 ? 16 : -16;
        const startRank = us === 0 ? 1 : 6;
        const promoRank = us === 0 ? 6 : 1;
        const rank = from >> 4;
        const one = from + dir;
        if (!(one & 0x88) && !b[one]) {
          if (rank === promoRank) {
            buf[n++] = encode(from, one, QUEEN, 0, 0);
            if (!capturesOnly) {
              buf[n++] = encode(from, one, KNIGHT, 0, 0);
              buf[n++] = encode(from, one, ROOK, 0, 0);
              buf[n++] = encode(from, one, BISHOP, 0, 0);
            }
          } else if (!capturesOnly) {
            buf[n++] = encode(from, one, 0, 0, 0);
            if (rank === startRank && !b[one + dir]) buf[n++] = encode(from, one + dir, 0, 0, FLAG_DOUBLE);
          }
        }
        for (let k = 0; k < 2; k++) {
          const to = one + (k === 0 ? -1 : 1);
          if (to & 0x88) continue;
          const target = b[to];
          if (target && target >> 3 === them) {
            if (rank === promoRank) {
              buf[n++] = encode(from, to, QUEEN, target, 0);
              if (!capturesOnly) {
                buf[n++] = encode(from, to, KNIGHT, target, 0);
                buf[n++] = encode(from, to, ROOK, target, 0);
                buf[n++] = encode(from, to, BISHOP, target, 0);
              }
            } else {
              buf[n++] = encode(from, to, 0, target, 0);
            }
          } else if (to === this.ep) {
            buf[n++] = encode(from, to, 0, PAWN | (them << 3), FLAG_EP);
          }
        }
      } else if (type === KNIGHT || type === KING) {
        const offs = type === KNIGHT ? KNIGHT_OFFSETS : KING_OFFSETS;
        for (let k = 0; k < 8; k++) {
          const to = from + offs[k];
          if (to & 0x88) continue;
          const target = b[to];
          if (!target) {
            if (!capturesOnly) buf[n++] = encode(from, to, 0, 0, 0);
          } else if (target >> 3 === them) {
            buf[n++] = encode(from, to, 0, target, 0);
          }
        }
        if (type === KING && !capturesOnly) n = this.genCastles(from, n);
      } else {
        const diag = type === BISHOP || type === QUEEN;
        const straight = type === ROOK || type === QUEEN;
        for (let g = 0; g < 2; g++) {
          if (g === 0 ? !straight : !diag) continue;
          const dirs = g === 0 ? ROOK_DIRS : BISHOP_DIRS;
          for (let k = 0; k < 4; k++) {
            const d = dirs[k];
            let to = from + d;
            while (!(to & 0x88)) {
              const target = b[to];
              if (!target) {
                if (!capturesOnly) buf[n++] = encode(from, to, 0, 0, 0);
              } else {
                if (target >> 3 === them) buf[n++] = encode(from, to, 0, target, 0);
                break;
              }
              to += d;
            }
          }
        }
      }
    }
    return n;
  }

  private genCastles(from: number, start: number): number {
    const b = this.board;
    const us = this.side;
    const them = us ^ 1;
    let n = start;
    const kingside = us === 0 ? WK : BK;
    const queenside = us === 0 ? WQ : BQ;
    const home = us === 0 ? 4 : 116;
    if (from !== home || !(this.castle & (kingside | queenside))) return n;
    if (this.isAttacked(home, them)) return n;
    if (this.castle & kingside && !b[home + 1] && !b[home + 2] && !this.isAttacked(home + 1, them)) {
      this.moveBuf[n++] = encode(home, home + 2, 0, 0, FLAG_CASTLE);
    }
    if (this.castle & queenside && !b[home - 1] && !b[home - 2] && !b[home - 3] && !this.isAttacked(home - 1, them)) {
      this.moveBuf[n++] = encode(home, home - 2, 0, 0, FLAG_CASTLE);
    }
    return n;
  }

  private make(m: number): boolean {
    const from = mFrom(m);
    const to = mTo(m);
    const promo = mPromo(m);
    const cap = mCap(m);
    const flag = mFlag(m);
    const u = this.hply;
    const us = this.side;
    this.uCastle[u] = this.castle;
    this.uEp[u] = this.ep;
    this.uHalf[u] = this.half;
    this.histLo[u] = this.lo;
    this.histHi[u] = this.hi;
    if (this.ep >= 0) {
      this.lo ^= Z_EP_LO[this.ep & 7];
      this.hi ^= Z_EP_HI[this.ep & 7];
    }
    if (cap) this.remove(flag === FLAG_EP ? to + (us === 0 ? -16 : 16) : to);
    const piece = this.board[from];
    this.remove(from);
    this.add(to, promo ? promo | (us << 3) : piece);
    if (flag === FLAG_CASTLE) {
      const rookFrom = to > from ? to + 1 : to - 2;
      const rookTo = to > from ? to - 1 : to + 1;
      const rook = this.board[rookFrom];
      this.remove(rookFrom);
      this.add(rookTo, rook);
    }
    this.lo ^= Z_CASTLE_LO[this.castle];
    this.hi ^= Z_CASTLE_HI[this.castle];
    this.castle &= CASTLE_MASK[from] & CASTLE_MASK[to];
    this.lo ^= Z_CASTLE_LO[this.castle];
    this.hi ^= Z_CASTLE_HI[this.castle];
    if (flag === FLAG_DOUBLE) {
      this.ep = (from + to) >> 1;
      this.lo ^= Z_EP_LO[this.ep & 7];
      this.hi ^= Z_EP_HI[this.ep & 7];
    } else {
      this.ep = -1;
    }
    this.half = cap || (piece & 7) === PAWN ? 0 : this.half + 1;
    this.side = us ^ 1;
    this.lo ^= Z_SIDE_LO;
    this.hi ^= Z_SIDE_HI;
    this.hply = u + 1;
    if (this.isAttacked(this.kingSq[us], us ^ 1)) {
      this.unmake(m);
      return false;
    }
    return true;
  }

  private unmake(m: number) {
    const from = mFrom(m);
    const to = mTo(m);
    const promo = mPromo(m);
    const cap = mCap(m);
    const flag = mFlag(m);
    const u = --this.hply;
    const us = this.side ^ 1;
    this.side = us;
    const moved = this.board[to];
    this.remove(to);
    this.add(from, promo ? PAWN | (us << 3) : moved);
    if (flag === FLAG_CASTLE) {
      const rookFrom = to > from ? to + 1 : to - 2;
      const rookTo = to > from ? to - 1 : to + 1;
      const rook = this.board[rookTo];
      this.remove(rookTo);
      this.add(rookFrom, rook);
    }
    if (cap) this.add(flag === FLAG_EP ? to + (us === 0 ? -16 : 16) : to, cap);
    this.castle = this.uCastle[u];
    this.ep = this.uEp[u];
    this.half = this.uHalf[u];
    this.lo = this.histLo[u];
    this.hi = this.histHi[u];
  }

  private makeNull() {
    const u = this.hply;
    this.uCastle[u] = this.castle;
    this.uEp[u] = this.ep;
    this.uHalf[u] = this.half;
    this.histLo[u] = this.lo;
    this.histHi[u] = this.hi;
    if (this.ep >= 0) {
      this.lo ^= Z_EP_LO[this.ep & 7];
      this.hi ^= Z_EP_HI[this.ep & 7];
      this.ep = -1;
    }
    this.half = 0;
    this.side ^= 1;
    this.lo ^= Z_SIDE_LO;
    this.hi ^= Z_SIDE_HI;
    this.hply = u + 1;
  }

  private unmakeNull() {
    const u = --this.hply;
    this.side ^= 1;
    this.ep = this.uEp[u];
    this.half = this.uHalf[u];
    this.lo = this.histLo[u];
    this.hi = this.histHi[u];
  }

  perft(depth: number, ply = 0): number {
    if (depth === 0) return 1;
    const start = ply * 256;
    const end = this.gen(start, false);
    let total = 0;
    for (let i = start; i < end; i++) {
      const m = this.moveBuf[i];
      if (this.make(m)) {
        total += this.perft(depth - 1, ply + 1);
        this.unmake(m);
      }
    }
    return total;
  }

  legalMoves(): EngineMove[] {
    const end = this.gen(0, false);
    const out: EngineMove[] = [];
    for (let i = 0; i < end; i++) {
      const m = this.moveBuf[i];
      if (this.make(m)) {
        out.push(toEngineMove(m));
        this.unmake(m);
      }
    }
    return out;
  }

  private isRepetition(): boolean {
    const floor = Math.max(0, this.hply - this.half);
    for (let i = this.hply - 2; i >= floor; i -= 2) {
      if (this.histLo[i] === this.lo && this.histHi[i] === this.hi) return true;
    }
    return false;
  }

  private insufficient(): boolean {
    const c = this.counts;
    if (c[PAWN] || c[PAWN | BLACK_BIT] || c[ROOK] || c[ROOK | BLACK_BIT] || c[QUEEN] || c[QUEEN | BLACK_BIT]) return false;
    return this.pcount[0] + this.pcount[1] <= 3;
  }

  /** Centipawns from the side to move's point of view. */
  evaluate(): number {
    const phase = Math.min(this.phase, 24);
    let mg = this.mg;
    let eg = this.eg;
    const b = this.board;
    const wFiles = new Int8Array(10);
    const bFiles = new Int8Array(10);
    for (let c = 0; c < 2; c++) {
      const base = c * 16;
      const files = c === 0 ? wFiles : bFiles;
      for (let i = 0; i < this.pcount[c]; i++) {
        const s = this.plist[base + i];
        if ((b[s] & 7) === PAWN) files[(s & 7) + 1]++;
      }
    }
    for (let c = 0; c < 2; c++) {
      const sign = c === 0 ? 1 : -1;
      const base = c * 16;
      const own = c === 0 ? wFiles : bFiles;
      const enemy = c === 0 ? bFiles : wFiles;
      for (let i = 0; i < this.pcount[c]; i++) {
        const s = this.plist[base + i];
        const type = b[s] & 7;
        const f = (s & 7) + 1;
        const r = s >> 4;
        if (type === PAWN) {
          if (!own[f - 1] && !own[f + 1]) {
            mg -= 12 * sign;
            eg -= 15 * sign;
          }
          if (own[f] > 1) {
            mg -= 8 * sign;
            eg -= 15 * sign;
          }
          let passed = true;
          for (let k = f - 1; k <= f + 1 && passed; k++) {
            if (enemy[k] > 0 && this.hasEnemyPawnAhead(k - 1, r, c)) passed = false;
          }
          if (passed) {
            const adv = c === 0 ? r : 7 - r;
            mg += (PASSED_BONUS[adv] >> 1) * sign;
            eg += PASSED_BONUS[adv] * sign;
          }
        } else if (type === ROOK) {
          if (!own[f]) {
            const bonus = enemy[f] ? 8 : 18;
            mg += bonus * sign;
            eg += (bonus >> 1) * sign;
          }
        } else if (type === KING && phase > 8) {
          const ahead = c === 0 ? s + 16 : s - 16;
          let shield = 0;
          for (let k = -1; k <= 1; k++) {
            const t = ahead + k;
            if (!(t & 0x88) && b[t] === (PAWN | (c << 3))) shield++;
          }
          mg += (shield * 9 - 12) * sign;
        }
      }
    }
    if (this.counts[BISHOP] >= 2) {
      mg += 25;
      eg += 40;
    }
    if (this.counts[BISHOP | BLACK_BIT] >= 2) {
      mg -= 25;
      eg -= 40;
    }
    let score = ((mg * phase + eg * (24 - phase)) / 24) | 0;
    score += this.mopUp(0) - this.mopUp(1);
    return (this.side === 0 ? score : -score) + 10;
  }

  private hasEnemyPawnAhead(file: number, rank: number, enemyOf: number): boolean {
    const enemyPawn = PAWN | ((enemyOf ^ 1) << 3);
    if (enemyOf === 0) {
      for (let r = rank + 1; r < 7; r++) if (this.board[r * 16 + file] === enemyPawn) return true;
    } else {
      for (let r = rank - 1; r > 0; r--) if (this.board[r * 16 + file] === enemyPawn) return true;
    }
    return false;
  }

  // With a bare enemy king, drive it to the edge and bring our own king close so wins convert.
  private mopUp(us: number): number {
    const them = us ^ 1;
    if (this.pcount[them] !== 1 || this.pcount[us] < 2) return 0;
    const heavy = this.counts[QUEEN | (us << 3)] + this.counts[ROOK | (us << 3)];
    if (!heavy && this.pcount[us] < 3) return 0;
    const ek = this.kingSq[them];
    const ok = this.kingSq[us];
    const ef = ek & 7;
    const er = ek >> 4;
    const centerDist = Math.max(3 - ef, ef - 4) + Math.max(3 - er, er - 4);
    const kingDist = Math.abs(ef - (ok & 7)) + Math.abs(er - (ok >> 4));
    return centerDist * 12 + (14 - kingDist) * 5 + 200;
  }

  private checkTime() {
    if ((this.nodes & 1023) === 0 && (this.cancelled || Date.now() > this.deadline)) this.stopped = true;
  }

  private scoreMoves(start: number, end: number, ttm: number, ply: number) {
    const b = this.board;
    for (let i = start; i < end; i++) {
      const m = this.moveBuf[i];
      let s: number;
      if (m === ttm) {
        s = 2000000;
      } else {
        const cap = mCap(m);
        const promo = mPromo(m);
        if (cap || promo) {
          s = 1000000 + SEE_VALUE[cap & 7] * 10 - SEE_VALUE[b[mFrom(m)] & 7] / 100 + (promo === QUEEN ? 9000 : 0);
        } else if (m === this.killers[ply * 2]) {
          s = 900000;
        } else if (m === this.killers[ply * 2 + 1]) {
          s = 800000;
        } else {
          s = this.history[(mFrom(m) << 7) | mTo(m)];
        }
      }
      this.scoreBuf[i] = s;
    }
  }

  private pick(i: number, end: number) {
    let best = i;
    for (let j = i + 1; j < end; j++) if (this.scoreBuf[j] > this.scoreBuf[best]) best = j;
    if (best !== i) {
      const m = this.moveBuf[i];
      this.moveBuf[i] = this.moveBuf[best];
      this.moveBuf[best] = m;
      const s = this.scoreBuf[i];
      this.scoreBuf[i] = this.scoreBuf[best];
      this.scoreBuf[best] = s;
    }
  }

  private quiesce(alpha: number, beta: number, ply: number): number {
    this.nodes++;
    this.checkTime();
    if (this.stopped) return 0;
    if (ply >= MAX_PLY) return this.evaluate();
    if (this.insufficient()) return 0;
    const check = this.inCheck();
    if (!check) {
      const stand = this.evaluate();
      if (stand >= beta) return stand;
      if (stand > alpha) alpha = stand;
    }
    const start = (ply + 1) * 256;
    const end = this.gen(start, !check);
    this.scoreMoves(start, end, 0, ply);
    let legal = 0;
    let best = check ? -MATE + ply : alpha;
    for (let i = start; i < end; i++) {
      this.pick(i, end);
      const m = this.moveBuf[i];
      if (!this.make(m)) continue;
      legal++;
      const score = -this.quiesce(-beta, -alpha, ply + 1);
      this.unmake(m);
      if (this.stopped) return 0;
      if (score > best) best = score;
      if (score > alpha) alpha = score;
      if (alpha >= beta) break;
    }
    if (check && legal === 0) return -MATE + ply;
    return best;
  }

  private search(depth: number, alpha: number, beta: number, ply: number, allowNull: boolean): number {
    this.nodes++;
    this.checkTime();
    if (this.stopped) return 0;
    if (ply > 0) {
      if (this.half >= 100 || this.isRepetition() || this.insufficient()) return 0;
      if (-MATE + ply >= beta) return beta;
    }
    if (ply >= MAX_PLY) return this.evaluate();
    const check = this.inCheck();
    if (check) depth++;
    if (depth <= 0) return this.quiesce(alpha, beta, ply);

    const slot = this.lo & (TT_SIZE - 1);
    let ttm = 0;
    if (this.ttLo[slot] === this.lo && this.ttHi[slot] === this.hi) {
      ttm = this.ttMove[slot];
      if (ply > 0 && this.ttDepth[slot] >= depth) {
        let s = this.ttScore[slot];
        if (s > MATE_BOUND) s -= ply;
        else if (s < -MATE_BOUND) s += ply;
        const flag = this.ttFlag[slot];
        if (flag === TT_EXACT) return s;
        if (flag === TT_LOWER && s >= beta) return s;
        if (flag === TT_UPPER && s <= alpha) return s;
      }
    }

    const isPv = beta - alpha > 1;
    const us = this.side;
    const nonPawn = this.pcount[us] - this.counts[PAWN | (us << 3)] - 1;
    if (allowNull && !isPv && !check && depth >= 3 && nonPawn > 0 && beta < MATE_BOUND && this.evaluate() >= beta) {
      this.makeNull();
      const score = -this.search(depth - 3 - (depth > 6 ? 1 : 0), -beta, -beta + 1, ply + 1, false);
      this.unmakeNull();
      if (this.stopped) return 0;
      if (score >= beta) return beta;
    }

    const start = (ply + 1) * 256;
    const end = this.gen(start, false);
    this.scoreMoves(start, end, ttm, ply);
    const alphaStart = alpha;
    let best = -INF;
    let bestMove = 0;
    let legal = 0;
    for (let i = start; i < end; i++) {
      this.pick(i, end);
      const m = this.moveBuf[i];
      if (!this.make(m)) continue;
      legal++;
      let score: number;
      const quiet = !mCap(m) && !mPromo(m);
      if (legal === 1) {
        score = -this.search(depth - 1, -beta, -alpha, ply + 1, true);
      } else {
        let reduction = 0;
        if (depth >= 3 && legal > 3 && quiet && !check && !this.inCheck()) reduction = legal > 10 ? 2 : 1;
        score = -this.search(depth - 1 - reduction, -alpha - 1, -alpha, ply + 1, true);
        if (score > alpha && (reduction > 0 || score < beta)) {
          score = -this.search(depth - 1, -beta, -alpha, ply + 1, true);
        }
      }
      this.unmake(m);
      if (this.stopped) return 0;
      if (score > best) {
        best = score;
        bestMove = m;
      }
      if (score > alpha) alpha = score;
      if (alpha >= beta) {
        if (quiet) {
          if (this.killers[ply * 2] !== m) {
            this.killers[ply * 2 + 1] = this.killers[ply * 2];
            this.killers[ply * 2] = m;
          }
          const key = (mFrom(m) << 7) | mTo(m);
          this.history[key] = Math.min(this.history[key] + depth * depth, 700000);
        }
        break;
      }
    }
    if (legal === 0) return check ? -MATE + ply : 0;

    let stored = best;
    if (stored > MATE_BOUND) stored += ply;
    else if (stored < -MATE_BOUND) stored -= ply;
    this.ttLo[slot] = this.lo;
    this.ttHi[slot] = this.hi;
    this.ttMove[slot] = bestMove;
    this.ttScore[slot] = stored;
    this.ttDepth[slot] = depth;
    this.ttFlag[slot] = best >= beta ? TT_LOWER : best > alphaStart ? TT_EXACT : TT_UPPER;
    return best;
  }

  cancel() {
    this.cancelled = true;
  }

  /**
   * Yields to the event loop between root moves, so the UI keeps painting while the bot thinks.
   * The time limit is enforced inside the tree, so a slow phone searches shallower rather than longer.
   */
  async think(opts: ThinkOptions): Promise<ThinkResult> {
    const rand = opts.random ?? Math.random;
    this.nodes = 0;
    this.stopped = false;
    this.cancelled = false;
    const begin = Date.now();
    this.deadline = begin + opts.timeMs;
    this.killers.fill(0);
    this.history.fill(0);

    const rootEnd = this.gen(0, false);
    const root: number[] = [];
    for (let i = 0; i < rootEnd; i++) {
      const m = this.moveBuf[i];
      if (this.make(m)) {
        root.push(m);
        this.unmake(m);
      }
    }
    const inCheckNow = this.inCheck();
    if (root.length === 0) {
      return { move: null, best: null, score: inCheckNow ? -MATE : 0, depth: 0, nodes: 0, lines: [] };
    }

    const margin = opts.margin ?? 0;
    const blunderMargin = Math.max(margin, opts.blunderMargin ?? 0);
    let order = root.map((m) => ({ m, score: 0 }));
    let completed: { m: number; score: number }[] | null = null;
    let completedDepth = 0;
    let lastYield = Date.now();

    for (let depth = 1; depth <= opts.maxDepth; depth++) {
      let bestScore = -INF;
      const results: { m: number; score: number }[] = [];
      for (let i = 0; i < order.length; i++) {
        const m = order[i].m;
        const floor = bestScore === -INF ? -INF : Math.max(-INF, bestScore - blunderMargin - 1);
        this.make(m);
        let score: number;
        if (i === 0 || blunderMargin > 0) {
          score = -this.search(depth - 1, -INF, -floor, 1, true);
        } else {
          score = -this.search(depth - 1, -bestScore - 1, -bestScore, 1, true);
          if (!this.stopped && score > bestScore) score = -this.search(depth - 1, -INF, -bestScore, 1, true);
        }
        this.unmake(m);
        if (this.stopped) break;
        results.push({ m, score });
        if (score > bestScore) bestScore = score;
        if (Date.now() - lastYield > 24) {
          await new Promise((resolve) => setTimeout(resolve, 0));
          lastYield = Date.now();
          if (this.cancelled) this.stopped = true;
          if (this.stopped) break;
        }
      }
      if (this.stopped || results.length < order.length) break;
      results.sort((a, b) => b.score - a.score);
      completed = results;
      completedDepth = depth;
      order = results;
      if (Math.abs(results[0].score) > MATE_BOUND && depth >= MATE - Math.abs(results[0].score) + 1) break;
      if (Date.now() - begin > opts.timeMs * 0.6) break;
    }

    // Depth 1 is always worth finishing, even when the budget is tiny or the device is slow.
    if (!completed) {
      this.deadline = Date.now() + 60000;
      this.stopped = false;
      const results: { m: number; score: number }[] = [];
      for (const { m } of order) {
        this.make(m);
        const score = -this.quiesce(-INF, INF, 1);
        this.unmake(m);
        results.push({ m, score });
      }
      results.sort((a, b) => b.score - a.score);
      completed = results;
      completedDepth = 1;
    }

    const top = completed[0].score;
    const allowed = rand() < (opts.blunderChance ?? 0) ? blunderMargin : margin;
    const pool = completed.filter((r) => r.score >= top - allowed);
    let chosen = completed[0].m;
    if (pool.length > 1 && allowed > 0) {
      let total = 0;
      const weights = pool.map((r) => {
        const w = Math.exp(-(top - r.score) / Math.max(20, allowed / 2));
        total += w;
        return w;
      });
      let roll = rand() * total;
      for (let i = 0; i < pool.length; i++) {
        roll -= weights[i];
        if (roll <= 0) {
          chosen = pool[i].m;
          break;
        }
      }
    }

    return {
      move: toEngineMove(chosen),
      best: toEngineMove(completed[0].m),
      score: top,
      depth: completedDepth,
      nodes: this.nodes,
      lines: completed.map((r) => ({ ...toEngineMove(r.m), score: r.score })),
    };
  }
}

/** Moves to mate if the score is a forced mate, positive when the side to move is mating. */
export function mateIn(score: number): number | null {
  if (Math.abs(score) <= MATE_BOUND) return null;
  const plies = MATE - Math.abs(score);
  const moves = Math.ceil(plies / 2);
  return score > 0 ? moves : -moves;
}
