// His legs move, his knee sensors report it, and his wiring answers (slice V3). Pure: no DOM, no three.js, no clock of its own.
// The puppet moves his legs: that is staged, and nothing here pretends otherwise. But a moving knee is a genuine stimulus to
// the sensors of that knee, exactly as staged tea is a genuine stimulus to his taste neurons. While gait.ts says a pair of legs
// is moving, the page replays the lab's whole-brain recording of those sensors being driven. Every spike of an interneuron, a
// brain neuron or a leg motor neuron in it is his wiring's answer: the trial drives the sensors and touches nothing else.
// His leg motor neurons firing does not move the puppet. Saying that it did would need an experiment, and there is none.

import type { Movement } from "./gait";
import { Replay, upTo, type ReplayOptions, type TrialRecording } from "./replay";

export type LegPair = "fl" | "ml" | "hl";
export interface Pool { id: string; leg: LegPair; label: string; bodyIds: string[] }
export interface MovementEntry {
  id: Movement; file: string; pairs: LegPair[]; seed: number; specSha256: string; spikeHash: string; sensors: Record<string, string[]>;
  spikes: number; neurons: number; neuronsBeyondSensors: number; readoutSpikes: number; readoutNeurons: number; otherMotorSpikes: number; otherMotorNeurons: number;
}
export interface MovementIndex { pilot: boolean; note: string; codecSha256: string; lockSha256: string; durationSteps: number; pools: Pool[]; otherMotorBodyIds: string[]; recordings: MovementEntry[] }
export interface LegsCodec { id: string; moving: { hz: number; thr16: number }; movements: { id: string; label: string; pairs: string[] }[] }

/** What the card says about his moving legs at one moment. Every count is "so far", since this movement began. */
export interface Moved {
  id: Movement; seed: number; steps: number; slowdown: number; pilot: boolean; hz: number;
  sensors: number;          // how many knee sensor neurons are driven
  sensorSpikes: number;
  cord: number;             // neurons beyond the sensors that have fired, with a cell body in the nerve cord
  brain: number;            // and in the brain
  unplaced: number;         // and with no cell body position at all
  motorNeurons: number;     // of those, leg motor neurons
  motorSpikes: number;
  motorTotal: number;       // how many leg motor neurons he has
  busiest: { label: string; leg: LegPair; spikes: number } | null;   // the pool with the most spikes so far: the busiest, which is seldom most of them
  otherMotorNeurons: number; // motor neurons that are not of his legs, and have fired too: wings, neck, abdomen, mouthparts
  otherMotorSpikes: number;
  undrawable: number;
}

// A movement that stops for less than this and starts again is the same movement: a turn between two stretches of a walk.
export const SAME_MOVEMENT_SECONDS = 0.25;

/** How long the legs have been moving. It counts only the time it is given, so a paused frame, with no time in it, holds it. */
export class MovementClock {
  private id: Movement | null = null;
  private seconds = 0;
  private idle = 0;

  tick(now: Movement | null, dt: number): { id: Movement; seconds: number } | null {
    if (now === null) {
      this.idle += dt;
      if (this.idle > SAME_MOVEMENT_SECONDS) { this.id = null; this.seconds = 0; }
      return null; // still legs drive nothing, whatever is remembered
    }
    if (now !== this.id) { this.id = now; this.seconds = 0; } else this.seconds += dt;
    this.idle = 0;
    return { id: now, seconds: this.seconds };
  }
}

export class MovementReplay {
  readonly replay: Replay;
  readonly sensors: number;
  readonly motorTotal: number;
  private readonly cordFirst: number[] = [];
  private readonly brainFirst: number[] = [];
  private readonly unplacedFirst: number[] = [];
  private readonly motorFirst: number[] = [];
  private readonly otherMotorFirst: number[] = [];
  private readonly otherMotorSteps: number[] = [];
  private readonly poolSteps: number[][];

  constructor(recording: TrialRecording, readonly entry: MovementEntry, private readonly pools: Pool[], otherMotor: Set<string>, cloudIndex: Map<string, number>, inCord: (point: number) => boolean) {
    const driven = [...new Set(Object.values(entry.sensors).flat())];
    const poolOf = new Map<string, number>();
    pools.forEach((pool, k) => pool.bodyIds.forEach((body) => poolOf.set(body, k)));
    this.replay = new Replay(recording, cloudIndex, new Map(driven.map((body, i) => [body, i])), new Set(poolOf.keys()));
    this.sensors = driven.length;
    this.motorTotal = poolOf.size;
    this.poolSteps = pools.map(() => []);
    const sensor = new Set(driven);
    const seen = new Set<string>();
    recording.spikeBodyId.forEach((body, i) => {
      const step = recording.spikeStep[i];
      const pool = poolOf.get(body);
      if (pool !== undefined) this.poolSteps[pool].push(step);
      if (otherMotor.has(body)) this.otherMotorSteps.push(step);
      if (sensor.has(body) || seen.has(body)) return;
      seen.add(body); // spikes come in step order, so this is the neuron's first
      const point = cloudIndex.get(body);
      (point === undefined ? this.unplacedFirst : inCord(point) ? this.cordFirst : this.brainFirst).push(step);
      if (pool !== undefined) this.motorFirst.push(step);
      if (otherMotor.has(body)) this.otherMotorFirst.push(step);
    });
  }

  countsAt(tStep: number): Pick<Moved, "sensorSpikes" | "cord" | "brain" | "unplaced" | "motorNeurons" | "motorSpikes" | "busiest" | "otherMotorNeurons" | "otherMotorSpikes" | "undrawable"> {
    const counts = this.replay.countsAt(tStep);
    let busiest: Moved["busiest"] = null;
    this.poolSteps.forEach((steps, k) => {
      const spikes = upTo(steps, tStep);
      if (spikes > (busiest?.spikes ?? 0)) busiest = { label: this.pools[k].label, leg: this.pools[k].leg, spikes };
    });
    return { sensorSpikes: counts.inputSpikes, cord: upTo(this.cordFirst, tStep), brain: upTo(this.brainFirst, tStep), unplaced: upTo(this.unplacedFirst, tStep),
      motorNeurons: upTo(this.motorFirst, tStep), motorSpikes: counts.readoutSpikes, busiest,
      otherMotorNeurons: upTo(this.otherMotorFirst, tStep), otherMotorSpikes: upTo(this.otherMotorSteps, tStep), undrawable: counts.undrawable };
  }
}

/** What is replayed, and lit, while his legs move. `moving` is null while they are still; `replay` while the recording has not arrived. */
export function movedAt(moving: { id: Movement; seconds: number } | null, replay: MovementReplay | null, pilot: boolean, hz: number, options: ReplayOptions):
    { moved: Moved | null; cloud: Float32Array | null } {
  if (!moving || !replay) return { moved: null, cloud: null };
  if (replay.entry.id !== moving.id) throw new Error(`the recording of ${replay.entry.id} cannot stand for ${moving.id}`);
  // a moment that is not a number would count nothing and light everything: it is refused, not shown
  if (!(moving.seconds >= 0)) throw new Error(`his legs cannot have been moving for ${moving.seconds} seconds`);
  const steps = Math.min(replay.replay.recording.spec.durationSteps - 1, Math.floor(moving.seconds * options.stepsPerSecond));
  return {
    moved: { id: moving.id, seed: replay.replay.recording.spec.seed, steps, slowdown: options.slowdown, pilot, hz, sensors: replay.sensors, motorTotal: replay.motorTotal, ...replay.countsAt(steps) },
    cloud: replay.replay.glowAt(steps, options.lightWindowSteps).cloud,
  };
}
