// How much each point of the cloud glows. Pure: spike counts in, light out.
// Rule 2 of the project: nothing looks like neural activity unless it is. No recording, no light.
// This file is covered by the banned-call check: no Math.random here, ever.

export interface Recording {
  spikeStep: number[];
  spikeBodyId: string[];
}

/**
 * Light per cloud point at scrub position `tStep`: the number of that neuron's spikes in the
 * window (tStep - windowSteps, tStep]. `index` maps a body ID to its point, for neurons that have one.
 */
export function light(points: number, index: Map<string, number>, recording: Recording | null, tStep: number, windowSteps: number): Float32Array {
  const out = new Float32Array(points);
  if (!recording) return out;
  // a moment that is not a number passes both comparisons below, and every spike of the recording would be lit at once
  if (!Number.isFinite(tStep) || !Number.isFinite(windowSteps)) throw new Error(`no such moment to light: step ${tStep}, window ${windowSteps}`);
  for (let i = 0; i < recording.spikeStep.length; i++) {
    const step = recording.spikeStep[i];
    if (step > tStep) break; // recordings are sorted by step
    if (step <= tStep - windowSteps) continue;
    const point = index.get(recording.spikeBodyId[i]);
    if (point !== undefined) out[point] += 1;
  }
  return out;
}
