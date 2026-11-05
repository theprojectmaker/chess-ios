// Mainline openings, so bots do not all start with the same moves.
const LINES = [
  'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O',
  'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+',
  'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O Re1 d6',
  'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7',
  'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Nc6',
  'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6',
  'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 d6 Bg5 e6',
  'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3 Qc7 Be3 a6',
  'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 cxd4 d6',
  'e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7 Bxe7 Qxe7',
  'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 a3 Nh6',
  'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6',
  'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 O-O Nc6',
  'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4 Bf5',
  'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O O-O c6',
  'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6',
  'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6',
  'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6',
  'd4 d5 Nf3 Nf6 Bf4 e6 e3 c5 c3 Nc6 Nbd2 Bd6',
  'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5',
  'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5',
  'd4 Nf6 c4 e6 Nf3 b6 g3 Ba6 b3 Bb4+ Bd2 Be7',
  'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 Bxa6 Nc3 d6',
  'c4 e5 Nc3 Nf6 Nf3 Nc6 g3 d5 cxd5 Nxd5 Bg2 Nb6',
  'c4 c5 Nf3 Nf6 Nc3 Nc6 g3 d5 cxd5 Nxd5 Bg2 Nc7',
  'Nf3 d5 g3 Nf6 Bg2 c6 O-O Bf5 d3 e6 Nbd2 h6',
  'Nf3 Nf6 c4 g6 Nc3 Bg7 e4 d6 d4 O-O Be2 e5',
].map((line) => line.split(' '));

/** Next book move in SAN, or null once the game has left the book. */
export function bookMove(historySan: string[], random: () => number = Math.random): string | null {
  const options = new Set<string>();
  for (const line of LINES) {
    if (line.length <= historySan.length) continue;
    if (historySan.every((san, i) => line[i] === san)) options.add(line[historySan.length]);
  }
  if (options.size === 0) return null;
  const list = [...options];
  return list[Math.floor(random() * list.length)];
}

export function inBook(historySan: string[]): boolean {
  return LINES.some((line) => line.length >= historySan.length && historySan.every((san, i) => line[i] === san));
}

export const BOOK_LINES = LINES;
