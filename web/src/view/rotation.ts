// Which sip comes next when nobody is choosing. A fixed rotation, not a random one: the same build
// always shows the same sequence. Every cycle of 25 visits each cell of the sweet-by-bitter grid once.

import { bitterLevel, type Codec } from "../codec/codec";

export interface Sip { teaId: string | null; scoops: number; sweets: number }

const GRID = 25;
const STRIDE = 7; // coprime with 25, so i * 7 mod 25 walks every cell

export function sipAt(codec: Codec, index: number): Sip {
  const cycle = Math.floor(index / GRID);
  const cell = ((index % GRID) * STRIDE) % GRID;
  const bitter = Math.floor(cell / 5);
  const sweets = cell % 5;
  if (bitter === 0) return { teaId: null, scoops: 0, sweets }; // sweets alone, over hot water
  const ways: Sip[] = [];
  for (const tea of codec.menu.teas) {
    for (let scoops = 1; scoops <= codec.menu.maxScoops; scoops++) {
      if (bitterLevel(codec, tea.id, scoops) === bitter) ways.push({ teaId: tea.id, scoops, sweets });
    }
  }
  return ways[(cycle * 3 + cell) % ways.length]; // a different tea for the same cell on later cycles
}
