// The spikes a sip forces in the input neurons: contracts/MODEL.md, "Input neurons".
// Inside its window an input neuron is forced to spike at step t iff lane16(seed, bodyId, t) < thr16. Strict.
// These spikes need no wiring, and they are exactly the ones any run of the whole brain would force for the same
// seed, so they can be shown live before the connectome is loaded. What the brain makes of them cannot.

import { counterOf, lane16 } from "./prng";

export interface InputNeuron { bodyId: string; thr16: number }
export interface Spikes { spikeStep: number[]; spikeBodyId: string[] }

export class InputLayer {
  private readonly neurons: { bodyId: string; low: number; high: number; thr16: number }[];

  constructor(private readonly seed: number, neurons: InputNeuron[]) {
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error(`seed ${seed} is not an unsigned 32-bit integer`);
    const seen = new Set<string>();
    for (const n of neurons) {
      if (!Number.isInteger(n.thr16) || n.thr16 < 0 || n.thr16 > 0xffff) throw new Error(`thr16 ${n.thr16} of ${n.bodyId} is out of range`);
      // BigInt() would take "", " 7 ", "0x10" and "-1" without complaint, and a negative high word wraps silently inside the generator
      if (!/^(0|[1-9]\d*)$/.test(n.bodyId) || BigInt(n.bodyId) > 0xffffffffffffffffn) throw new Error(`body ID ${JSON.stringify(n.bodyId)} is not an unsigned 64-bit integer in plain decimal`);
      if (seen.has(n.bodyId)) throw new Error(`body ID ${n.bodyId} is driven twice`); // MODEL.md: a neuron may appear in at most one drive
      seen.add(n.bodyId);
    }
    // within a step, spikes are listed by ascending body ID, as the oracle lists them
    this.neurons = neurons
      .map((n) => { const [low, high] = counterOf(n.bodyId); return { bodyId: n.bodyId, low, high, thr16: n.thr16 }; })
      .sort((a, b) => a.high - b.high || a.low - b.low);
  }

  /** Append the forced spikes of steps [fromStep, toStep) to `out`, in step order. */
  run(fromStep: number, toStep: number, out: Spikes): void {
    if (!Number.isInteger(fromStep) || !Number.isInteger(toStep) || fromStep < 0 || toStep < fromStep) throw new Error(`no such steps: ${fromStep} to ${toStep}`);
    for (let step = fromStep; step < toStep; step++) {
      for (const n of this.neurons) {
        if (lane16(this.seed, n.low, n.high, step) < n.thr16) {
          out.spikeStep.push(step);
          out.spikeBodyId.push(n.bodyId);
        }
      }
    }
  }
}
