// The model's random input, in the browser: contracts/MODEL.md, "Random input". Held to contracts/fixtures/prng.
// threefry2x32 with 20 rounds on unsigned 32-bit words. A neuron's train depends only on (seed, bodyId, step),
// so it is the same in the whole brain, in any part of it and under any lesion. No float takes part in deciding a spike.
// This is the first file of the browser engine (slice 08). Folder rules: no clock and no other randomness in here.

const ROTATIONS = [[13, 15, 26, 6], [17, 29, 16, 24]] as const;
const rotl32 = (x: number, r: number): number => ((x << r) | (x >>> (32 - r))) >>> 0;

/** Words are unsigned 32-bit integers held in doubles; every sum stays below 2^34, so it is exact before it wraps. */
export function threefry2x32(counter0: number, counter1: number, key0: number, key1: number): [number, number] {
  const ks = [key0 >>> 0, key1 >>> 0, (key0 ^ key1 ^ 0x1bd11bda) >>> 0];
  let x0 = (counter0 + ks[0]) >>> 0;
  let x1 = (counter1 + ks[1]) >>> 0;
  for (let group = 1; group <= 5; group++) {
    for (const r of ROTATIONS[(group + 1) % 2]) {
      x0 = (x0 + x1) >>> 0;
      x1 = (rotl32(x1, r) ^ x0) >>> 0;
    }
    x0 = (x0 + ks[group % 3]) >>> 0;
    x1 = (x1 + ks[(group + 1) % 3] + group) >>> 0;
  }
  return [x0, x1];
}

/** A body ID as the two words of the counter: (bodyId mod 2^32, floor(bodyId / 2^32)). */
export function counterOf(bodyId: string): [number, number] {
  const id = BigInt(bodyId);
  return [Number(id & 0xffffffffn), Number(id >> 32n)];
}

/** The 16-bit lane that decides step `step` of one neuron. One block of the generator serves four steps. */
export function lane16(seed: number, idLow: number, idHigh: number, step: number): number {
  const [w0, w1] = threefry2x32(idLow, idHigh, seed, Math.floor(step / 4));
  switch (step % 4) {
    case 0: return w0 & 0xffff;
    case 1: return w0 >>> 16;
    case 2: return w1 & 0xffff;
    default: return w1 >>> 16;
  }
}
