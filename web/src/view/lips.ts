// Where the taste neurons are drawn. None of them has a cell body inside the imaged volume, so none is in the cloud.
// They sit on the fly: two lobes at the tip of his proboscis, left and right, one dot per neuron.
// Which neuron is on which side is from the dataset. Where a dot sits within its lobe is ours (staged).

import type { Mouthpart } from "./cloud";

export interface LipDot { bodyId: string; group: Mouthpart["group"]; side: Mouthpart["side"]; speaks: boolean; u: number; v: number }

const COLUMNS = 5;
const PITCH = 0.17;
const CENTRE: Record<Mouthpart["side"], number> = { L: -0.55, unknown: 0, R: 0.55 };

/** Dots in the square [-1, 1] by [-1, 1], u to the fly's right, v up. Sweet rows first, then bitter on a fresh row. */
export function lipLayout(mouthparts: Mouthpart[]): LipDot[] {
  const dots: LipDot[] = [];
  for (const side of ["L", "unknown", "R"] as const) {
    let row = 0;
    for (const group of ["grn.sweet", "grn.bitter"] as const) {
      const members = mouthparts
        .filter((m) => m.side === side && m.group === group)
        .sort((a, b) => Number(b.speaks) - Number(a.speaks) || (BigInt(a.bodyId) < BigInt(b.bodyId) ? -1 : 1));
      members.forEach((m, k) => {
        const column = k % COLUMNS;
        const line = row + Math.floor(k / COLUMNS);
        dots.push({ ...m, u: CENTRE[side] + (column - (COLUMNS - 1) / 2) * PITCH, v: 0.68 - line * PITCH });
      });
      row += Math.ceil(members.length / COLUMNS);
    }
  }
  return dots;
}
