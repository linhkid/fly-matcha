// Replaying a whole-brain recording of a sip (slice V2). Pure: no DOM, no three.js, no clock of its own.
// Every spike comes from a TrialRecording written by the lab's run_trial. A spike lands on a point of the cloud, on a
// dot of his lips, or, for a neuron with no position anywhere, nowhere: those are counted and the page says so.
// How far the replay has run is a function of the ceremony's clock alone, so a held clock holds it and a still repeats it.
// His lips are on the tea while that clock stands inside the touch window and he is at his work: this is the one owner
// of "touching". A viewer's pause stops the clock and leaves his lips, and the light of that moment, where they are.
// A break takes him away from the cup, and then nothing is lit.

import { light } from "./light";
import type { LoopState } from "./loop";
import { touchWindow } from "./puppet";

export type Outcome = "extend" | "refuse" | "neither";
export interface RecordingEntry {
  file: string; sweet: number; bitter: number; seed: number; specSha256: string; spikeHash: string;
  spikes: number; neurons: number; neuronsBeyondTaste: number;
  readoutSpikes: number; readoutFirstStep: number | null; readoutLastStep: number | null;
  windowCount?: number; outcome?: Outcome;   // only with a licensed decoder: MN9's count in the decoder's window, and what it decodes to
}
/** The decoder an experiment licensed: thresholds on MN9's count in a window of the trial, with a pointer to the evidence. */
export interface Decoder { window: [number, number]; extendAtLeast: number; refuseAtMost: number; evidence: { experiment: string } }
export interface RecordingIndex {
  pilot: boolean; note: string; modelId: string; graphSha256: string; codecSha256: string; durationSteps: number; dtMs: number;
  readout: { group: string; bodyIds: string[] }; decoder: Decoder | null; recordings: RecordingEntry[];
}
export interface TrialRecording { spikeStep: number[]; spikeBodyId: string[]; spikeHash: string; spec: { seed: number; durationSteps: number } }

/** What the card says about a replay at one moment. */
export interface Replayed {
  seed: number; steps: number; slowdown: number; touching: boolean; pilot: boolean;
  tasteSpikes: number;      // spikes of his taste neurons so far
  otherNeurons: number;     // neurons beyond them that have fired at least once so far
  readoutSpikes: number;    // spikes of MN9 so far
  undrawable: number;       // spikes so far of neurons that have no position: they happened, and cannot be shown
  extension: number;        // 0..1, how far his proboscis is out now. Zero unless drinking is licensed.
  drunk: number;            // 0..1 of the cup, so far. Zero unless drinking is licensed.
}

export interface ReplayOptions { stepsPerSecond: number; lightWindowSteps: number; slowdown: number }

export function entryFor(index: RecordingIndex, sweet: number, bitter: number): RecordingEntry {
  const entry = index.recordings.find((r) => r.sweet === sweet && r.bitter === bitter);
  if (!entry) throw new Error(`no recording of sweet ${sweet}, bitter ${bitter}`);
  return entry;
}

// He is never rushed, and he never outstays the recording. Between those, his brain sets the time.
export const STAY_SECONDS = { least: 8, most: 20, breath: 1 };
/** The seconds of a taste phase that are not spent with his lips on the tea: looking, lowering, rising. The same for every stay. */
export const STAY_OVERHEAD = (() => { const [from, to] = touchWindow(STAY_SECONDS.most); return STAY_SECONDS.most - (to - from); })();

/**
 * How long he stays with the cup. The model's part: the step of MN9's last spike in the recording. Ours: that his lips
 * stay on the tea until then and one breath longer, at the view's slowdown, and never less than the least or more than the most.
 * A sip that never reaches MN9 gets the shortest stay; one that keeps it firing to the end of the trial gets the longest.
 */
export function staySecondsFor(entry: RecordingEntry, stepsPerSecond: number): number {
  return stayFor(entry, stepsPerSecond).seconds;
}

/**
 * The stay, and the true reason for its length, because the card must not say "until MN9 fell silent" of a bowl in
 * which MN9 never fired, or of one where the longest stay ended first.
 */
export interface Stay { seconds: number; why: "never" | "early" | "silent" | "longest"; lastStep: number | null }
export function stayFor(entry: RecordingEntry, stepsPerSecond: number): Stay {
  const lastStep = entry.readoutLastStep;
  if (lastStep === null) return { seconds: STAY_SECONDS.least, why: "never", lastStep };
  const wanted = lastStep / stepsPerSecond + STAY_SECONDS.breath + STAY_OVERHEAD;
  if (wanted <= STAY_SECONDS.least) return { seconds: STAY_SECONDS.least, why: "early", lastStep };
  if (wanted > STAY_SECONDS.most) return { seconds: STAY_SECONDS.most, why: "longest", lastStep };
  return { seconds: wanted, why: "silent", lastStep };
}

// MN9 lifts the proboscis. How its spikes become a movement is ours: the proboscis is fully out when MN9 has fired
// three times in the last 30 ms of his time, and a quarter of a second of full extension empties the cup.
export const DRINK = { windowSteps: 300, fullAt: 3, drainSteps: 2500 };

const upTo = (sorted: ArrayLike<number>, value: number): number => { // how many entries are <= value
  let [low, high] = [0, sorted.length];
  while (low < high) { const middle = (low + high) >> 1; if (sorted[middle] <= value) low = middle + 1; else high = middle; }
  return low;
};

export class Replay {
  readonly participants: number[];                 // points of the cloud that fire at least once, ascending
  readonly readoutPlaces: number[];                // which of the participants are the readout, MN9: they are drawn larger
  private readonly place: Map<string, number>;     // body ID -> its rank among the participants
  private readonly tasteUpTo: Uint32Array;         // prefix counts over the recording's spikes
  private readonly readoutUpTo: Uint32Array;
  private readonly nowhereUpTo: Uint32Array;
  private readonly firstSteps: number[];           // when each neuron beyond the taste neurons first fired, ascending
  private readonly readoutSteps: number[];         // when MN9 fired, ascending
  private readonly drained: Float32Array;          // by step: the share of the cup that full extension so far would have emptied

  constructor(readonly recording: TrialRecording, cloudIndex: Map<string, number>, private readonly lipIndex: Map<string, number>, readout: Set<string>) {
    const { spikeStep, spikeBodyId } = recording;
    for (let i = 1; i < spikeStep.length; i++) if (spikeStep[i] < spikeStep[i - 1]) throw new Error("a recording's spikes must be in step order");
    const points = new Set<number>();
    const first = new Map<string, number>();
    this.tasteUpTo = new Uint32Array(spikeStep.length + 1);
    this.readoutUpTo = new Uint32Array(spikeStep.length + 1);
    this.nowhereUpTo = new Uint32Array(spikeStep.length + 1);
    spikeBodyId.forEach((body, i) => {
      const onLips = lipIndex.has(body);
      const point = cloudIndex.get(body);
      if (point !== undefined) points.add(point);
      if (!onLips && !first.has(body)) first.set(body, spikeStep[i]);
      this.tasteUpTo[i + 1] = this.tasteUpTo[i] + (onLips ? 1 : 0);
      this.readoutUpTo[i + 1] = this.readoutUpTo[i] + (readout.has(body) ? 1 : 0);
      this.nowhereUpTo[i + 1] = this.nowhereUpTo[i] + (!onLips && point === undefined ? 1 : 0);
    });
    this.participants = [...points].sort((a, b) => a - b);
    const rank = new Map(this.participants.map((point, k) => [point, k]));
    this.place = new Map();
    for (const body of new Set(spikeBodyId)) { const point = cloudIndex.get(body); if (point !== undefined) this.place.set(body, rank.get(point)!); }
    this.firstSteps = [...first.values()].sort((a, b) => a - b);
    this.readoutSteps = spikeStep.filter((_, i) => readout.has(spikeBodyId[i]));
    this.drained = new Float32Array(recording.spec.durationSteps);
    let total = 0;
    for (let t = 0; t < this.drained.length; t++) { total += this.extensionAt(t); this.drained[t] = Math.min(1, total / DRINK.drainSteps); }
    this.readoutPlaces = [...readout].map((body) => this.place.get(body)).filter((k): k is number => k !== undefined).sort((a, b) => a - b);
  }

  /** How far out his proboscis is at a step: MN9's spikes in the window that ends there, against the number that means fully out. */
  extensionAt(tStep: number): number {
    const inWindow = upTo(this.readoutSteps, tStep) - upTo(this.readoutSteps, tStep - DRINK.windowSteps);
    return Math.min(1, inWindow / DRINK.fullAt);
  }

  drunkAt(tStep: number): number {
    return tStep < 0 ? 0 : this.drained[Math.min(tStep, this.drained.length - 1)];
  }

  /** Counts of everything that has happened up to and including step `tStep`. */
  countsAt(tStep: number): Pick<Replayed, "tasteSpikes" | "otherNeurons" | "readoutSpikes" | "undrawable"> {
    const seen = upTo(this.recording.spikeStep, tStep);
    return { tasteSpikes: this.tasteUpTo[seen], readoutSpikes: this.readoutUpTo[seen], undrawable: this.nowhereUpTo[seen], otherNeurons: upTo(this.firstSteps, tStep) };
  }

  /** Light for the participants and for his lips: spikes in the window that ends at `tStep`, through light() and nothing else. */
  glowAt(tStep: number, windowSteps: number): { cloud: Float32Array; lips: Float32Array } {
    return {
      cloud: light(this.participants.length, this.place, this.recording, tStep, windowSteps),
      lips: light(this.lipIndex.size, this.lipIndex, this.recording, tStep, windowSteps),
    };
  }
}

/** What is replayed, and lit, at a moment of the ceremony. `replay` is null while the recording has not arrived. */
export function replayAt(state: LoopState, away: boolean, replay: Replay | null, lips: number, pilot: boolean, options: ReplayOptions, licensed = false):
    { replayed: Replayed | null; cloud: Float32Array | null; lips: Float32Array } {
  const dark = new Float32Array(lips);
  if (state.phase !== "taste" || !replay) return { replayed: null, cloud: null, lips: dark };
  const [from, to] = touchWindow(state.phaseSeconds);
  const t = state.progress * state.phaseSeconds;
  if (t < from) return { replayed: null, cloud: null, lips: dark };
  const steps = Math.min(replay.recording.spec.durationSteps - 1, Math.floor((Math.min(t, to) - from) * options.stepsPerSecond));
  const touching = t <= to && !away;
  const glow = touching ? replay.glowAt(steps, options.lightWindowSteps) : null;
  return {
    // Drinking is a mechanic, and a mechanic needs a passed experiment. Unlicensed, MN9 is counted and lit and moves nothing.
    replayed: { seed: replay.recording.spec.seed, steps, slowdown: options.slowdown, touching, pilot, ...replay.countsAt(steps),
      extension: licensed && touching ? replay.extensionAt(steps) : 0, drunk: licensed ? replay.drunkAt(steps) : 0 },
    cloud: glow ? glow.cloud : null,
    lips: glow ? glow.lips : dark,
  };
}
