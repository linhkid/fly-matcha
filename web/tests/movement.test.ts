// His legs (slice V3). Two promises are held here. The puppet's promise: a pair of legs that is said to move has knees
// whose angle changes, and a pair that is not, has not, because the answer decides which knee sensors are driven.
// And rule 2: still legs light nothing, and every count on the card is a count of spikes in the lab's recording.
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { audit } from "../src/honesty/honesty";
import type { CloudInfo } from "../src/view/cloud";
import { legAngles, movementOf, type FlyMotion, type LegPlan } from "../src/view/gait";
import { movedAt, MovementClock, MovementReplay, SAME_MOVEMENT_SECONDS, type LegsCodec, type MovementEntry, type MovementIndex, type Pool } from "../src/view/movement";
import { quantities, reactionCard, type Legs } from "../src/view/reaction";
import type { Codec } from "../src/codec/codec";
import type { TrialRecording } from "../src/view/replay";
import { sipAt } from "../src/view/rotation";

const root = new URL("../../", import.meta.url);
const still: FlyMotion = { t: 0, stride: 0, walking: 0, lean: 0, calm: 0, reading: 0, whisking: 0, wiping: 0, sifting: 0, holding: 0, lifting: 0, proboscis: 0 };
const legs: LegPlan[] = [0, 1, 2].flatMap((pair) => [0, 1].map((side) => ({ pair, tripod: (pair + side) % 2, restYaw: 0.4 - 0.5 * pair })));
const moments = [0, 0.013, 0.05, 0.11, 0.37, 1.9];
/** How much a leg's knee angle changes as time and the gait run on. */
const kneeTravel = (m: FlyMotion, leg: LegPlan): number => {
  const bends = moments.map((at) => legAngles({ ...m, t: at, stride: m.walking > 0 ? at * 9 : m.stride }, leg).bend);
  return Math.max(...bends) - Math.min(...bends);
};

describe("which legs are moving", () => {
  it("says none while he stands, reads, leans or holds his lips to the tea, and then no joint of any leg changes", () => {
    for (const pose of [still, { ...still, reading: 1 }, { ...still, lean: 1, calm: 1 }, { ...still, walking: 0.04, whisking: 0.04 }]) {
      expect(movementOf(pose)).toBeNull();
    }
    // holding something up, still, is a pose and not a movement
    for (const pose of [still, { ...still, reading: 1 }, { ...still, lean: 1, calm: 1 }, { ...still, holding: 1 }]) {
      for (const leg of legs) {
        const seen = moments.map((at) => JSON.stringify(legAngles({ ...pose, t: at, stride: at * 9 }, leg)));
        expect(new Set(seen).size).toBe(1);
      }
    }
  });

  it("says the front pair while he whisks, wipes or sifts: their knees move, and no joint of the other four legs does", () => {
    for (const work of ["whisking", "wiping", "sifting"] as const) {
      const pose = { ...still, [work]: 1 };
      expect(movementOf(pose)).toBe("front");
      for (const leg of legs) {
        if (leg.pair === 0) expect(kneeTravel(pose, leg), work).toBeGreaterThan(0.02);
        else expect(new Set(moments.map((at) => JSON.stringify(legAngles({ ...pose, t: at }, leg)))).size).toBe(1);
      }
    }
  });

  it("says the front pair while he lifts something or sets it down: their knees move with it, and no other leg does", () => {
    const heights = [0, 0.2, 0.5, 0.8, 1];
    expect(movementOf({ ...still, holding: 0.5, lifting: 1 })).toBe("front");
    expect(movementOf({ ...still, holding: 1, lifting: 0 })).toBeNull();
    for (const leg of legs) {
      const bends = heights.map((holding) => legAngles({ ...still, holding, lifting: 1 }, leg).bend);
      if (leg.pair === 0) expect(Math.max(...bends) - Math.min(...bends)).toBeGreaterThan(0.02);
      else expect(new Set(bends).size).toBe(1);
    }
  });

  it("says all six while he walks, and then every knee moves, in the foot's time on the table as well as in the air", () => {
    const pose = { ...still, walking: 1 };
    expect(movementOf(pose)).toBe("walk");
    expect(movementOf({ ...pose, whisking: 1 })).toBe("walk");   // legs that walk are all moving, whatever the front pair holds
    for (const leg of legs) expect(kneeTravel(pose, leg)).toBeGreaterThan(0.02);
    // stance alone: the half of the step in which this leg does not swing
    for (const leg of legs) {
      const stance = [1.1, 1.3, 1.5, 1.7, 1.9].map((turns) => legAngles({ ...pose, stride: turns * Math.PI - leg.tripod * Math.PI }, leg).bend);
      expect(Math.max(...stance) - Math.min(...stance), `pair ${leg.pair}`).toBeGreaterThan(0.01);
    }
  });
});

describe("the movement clock", () => {
  it("counts only the time it is given, so a paused frame holds the movement and its light", () => {
    const clock = new MovementClock();
    expect(clock.tick("walk", 0.5)).toEqual({ id: "walk", seconds: 0 });
    expect(clock.tick("walk", 0.5)).toEqual({ id: "walk", seconds: 0.5 });
    expect(clock.tick("walk", 0)).toEqual({ id: "walk", seconds: 0.5 });
    expect(clock.tick("walk", 0)).toEqual({ id: "walk", seconds: 0.5 });
  });

  it("drives nothing while his legs are still, takes a turn between two stretches of a walk as one walk, and starts again after a rest or a change", () => {
    const clock = new MovementClock();
    clock.tick("walk", 0.1);
    clock.tick("walk", 1);
    expect(clock.tick(null, SAME_MOVEMENT_SECONDS / 2)).toBeNull();
    expect(clock.tick("walk", 0.1)).toEqual({ id: "walk", seconds: 1.1 });
    expect(clock.tick(null, SAME_MOVEMENT_SECONDS * 2)).toBeNull();
    expect(clock.tick("walk", 0.1)).toEqual({ id: "walk", seconds: 0 });
    clock.tick("walk", 2);
    expect(clock.tick("front", 0.1)).toEqual({ id: "front", seconds: 0 });
  });
});

// sensors 1 and 2 are driven; 100 lies in the cord and 200 in the brain; 300 and 400 are leg motor neurons, in the cord; 777 has no position;
// 200 is a motor neuron too, of something that is not a leg
const cloudIndex = new Map([["100", 0], ["200", 1], ["300", 2], ["400", 3]]);
const inCord = (point: number): boolean => point !== 1;
const pools: Pool[] = [{ id: "mn.fl.a", leg: "fl", label: "Ti flexor", bodyIds: ["300"] }, { id: "mn.hl.b", leg: "hl", label: "Tr extensor", bodyIds: ["400", "401"] }];
const recording: TrialRecording = {
  spec: { seed: 1, durationSteps: 3000 }, spikeHash: "h",
  spikeStep: [0, 3, 20, 25, 40, 41, 60, 60, 80, 95],
  spikeBodyId: ["1", "2", "100", "1", "300", "777", "200", "400", "400", "100"],
};
const entry: MovementEntry = { id: "walk", file: "f", pairs: ["fl", "ml", "hl"], seed: 1, specSha256: "", spikeHash: "h", sensors: { hook: ["1"], claw: ["2"] }, spikes: 10, neurons: 7, neuronsBeyondSensors: 5, readoutSpikes: 3, readoutNeurons: 2, otherMotorSpikes: 1, otherMotorNeurons: 1 };
const options = { stepsPerSecond: 200, lightWindowSteps: 60, slowdown: 50 };
const replay = (): MovementReplay => new MovementReplay(recording, entry, pools, new Set(["200"]), cloudIndex, inCord);

describe("his wiring's answer to his moving legs", () => {
  it("counts, up to each moment, the sensors' spikes, who has answered and where, and which motor neurons fired", () => {
    const r = replay();
    expect([r.sensors, r.motorTotal]).toEqual([2, 3]);
    expect(r.countsAt(10)).toEqual({ sensorSpikes: 2, cord: 0, brain: 0, unplaced: 0, motorNeurons: 0, motorSpikes: 0, busiest: null, otherMotorNeurons: 0, otherMotorSpikes: 0, undrawable: 0 });
    expect(r.countsAt(40)).toEqual({ sensorSpikes: 3, cord: 2, brain: 0, unplaced: 0, motorNeurons: 1, motorSpikes: 1, busiest: { label: "Ti flexor", leg: "fl", spikes: 1 }, otherMotorNeurons: 0, otherMotorSpikes: 0, undrawable: 0 });
    expect(r.countsAt(3000)).toEqual({ sensorSpikes: 3, cord: 3, brain: 1, unplaced: 1, motorNeurons: 2, motorSpikes: 3, busiest: { label: "Tr extensor", leg: "hl", spikes: 2 }, otherMotorNeurons: 1, otherMotorSpikes: 1, undrawable: 1 });
  });

  it("lights nothing while his legs are still or the recording has not arrived, and refuses one movement's recording for another", () => {
    expect(movedAt(null, replay(), true, 100, options)).toEqual({ moved: null, cloud: null });
    expect(movedAt({ id: "walk", seconds: 1 }, null, true, 100, options)).toEqual({ moved: null, cloud: null });
    expect(() => movedAt({ id: "front", seconds: 1 }, replay(), true, 100, options)).toThrow(/cannot stand for/);
    // a moment that is not a number would count nothing and light every neuron that ever fires: refused
    for (const seconds of [NaN, -1, Number("abc")]) expect(() => movedAt({ id: "walk", seconds }, replay(), true, 100, options)).toThrow(/cannot have been moving/);
  });

  it("replays as far as his legs have been moving, at the view's slowdown, and never past the recording", () => {
    const at = (seconds: number) => movedAt({ id: "walk", seconds }, replay(), true, 100, options);
    expect(at(0.2).moved).toMatchObject({ steps: 40, motorSpikes: 1, sensors: 2, hz: 100, seed: 1, pilot: true });
    expect(at(99).moved!.steps).toBe(2999);
    // light is spikes in the window that ends now: at step 40 the cord neuron and the motor neuron, not the brain neuron that fires at 60
    const glow = at(0.2).cloud!;
    expect(glow.length).toBe(replay().replay.participants.length);
    expect([...glow].map((v) => v > 0)).toEqual([true, false, true, false]);
    expect([...at(5).cloud!].every((v) => v === 0)).toBe(true);   // long after the last spike: dark
  });
});

describe("the line about his legs", () => {
  const codec: Codec = JSON.parse(readFileSync(new URL("contracts/codec/taste.codec.json", root), "utf8"));
  const info = { version: 1, dataset: "", typedNeurons: 0, points: 0, groups: [], mouthparts: [], note: "" } satisfies CloudInfo;
  const lineFor = (state: Legs): string => {
    const reg = quantities();
    const card = reactionCard(reg, codec, info, { sip: sipAt(codec, 3), phase: "brew", phaseSeconds: 4.5, stay: { seconds: 8, why: "never", lastStep: null }, away: null, replayed: null, waiting: false, frozen: false, summary: null, verdict: null, bowl: 0, legs: state });
    expect(audit(card.lines.map((l) => l.html).join(""), reg)).toEqual([]);
    expect(card.lines[4].tags).toContain("model");
    expect(card.footnote).toMatch(/His motor neurons firing moves nothing here\./);   // said on every card, moving or not
    return card.lines[4].html.replace(/<[^>]*>/g, "") + " || " + card.lines[5].html.replace(/<[^>]*>/g, "");
  };

  it("says that still legs drive nothing, and that a recording on its way shows nothing", () => {
    expect(lineFor({ state: "still" })).toMatch(/still, so nothing drives their sensors/);
    expect(lineFor({ state: "waiting", id: "front" })).toMatch(/front legs are at work.*has not arrived yet.*\|\| Nothing is being replayed: the recording for his moving legs is not here\.$/);
    expect(lineFor({ state: "waiting", id: "front" })).not.toMatch(/legs are still/);   // the folded line may not contradict the one above it
    expect(lineFor({ state: "failed", id: "walk" })).toMatch(/^All six legs are moving\. The recording of his nervous system for it could not be loaded, so nothing is shown\. \|\| Nothing is being replayed: the recording for his moving legs is not here\.$/);
  });

  it("says who is driven, who answered, and that his motor neurons move nothing here", () => {
    const moved = movedAt({ id: "walk", seconds: 99 }, replay(), true, 100, options).moved!;
    const text = lineFor({ state: "moving", moved });
    expect(text).toMatch(/^All six legs are moving, so their knee sensors are driven: 2 neurons at 100 Hz\./);
    expect(text).toMatch(/3 neurons of his nerve cord, 1 with no cell body position and 1 of his brain have answered\. 2 of his 3 leg motor neurons have fired, 3 spikes in all\. The busiest pool so far, with 2 of them, is Tr extensor of his hind legs\. They are not alone: 1 motor neuron of another part of him has fired too\./);
    expect(text).not.toMatch(/most of/);   // the busiest pool is a plurality: in the real walk it holds about a fifth of the spikes
    expect(text).toMatch(/\|\| His legs: his knee sensors have no cell body in the imaged volume, so their 3 spikes so far are counted and cannot be drawn, and neither can 1 spike of other neurons without a position\. A pilot recording of his whole nervous system, seed 1: what was measured, not a claim about walking\. Shown 50 times slower than his time\.$/);
    expect(text).not.toMatch(/\b(decides?|wants?|tries|chooses?|tired)\b/i);
  });
});

const recordingsDir = new URL("data/built/web/recordings/", root);
describe.runIf(existsSync(new URL("index.json", recordingsDir)))("the committed recordings of his moving legs", () => {
  const index: { movements: MovementIndex } = JSON.parse(readFileSync(new URL("index.json", recordingsDir), "utf8"));
  const legsCodec: LegsCodec = JSON.parse(readFileSync(new URL("contracts/codec/legs.codec.json", root), "utf8"));

  it("are one for every movement the puppet can make, and the page counts in them what the lab counted", () => {
    expect(index.movements.recordings.map((r) => r.id).sort()).toEqual(["front", "walk"]);
    expect(legsCodec.movements.map((m) => m.id).sort()).toEqual(["front", "walk"]);
    for (const each of index.movements.recordings) {
      const recording: TrialRecording = JSON.parse(readFileSync(new URL(each.file, recordingsDir), "utf8"));
      expect(recording.spikeHash).toBe(each.spikeHash);
      const r = new MovementReplay(recording, each, index.movements.pools, new Set(index.movements.otherMotorBodyIds), new Map(), () => true);
      const end = r.countsAt(recording.spec.durationSteps);
      expect(end.cord + end.brain + end.unplaced).toBe(each.neuronsBeyondSensors);
      expect([end.motorNeurons, end.motorSpikes]).toEqual([each.readoutNeurons, each.readoutSpikes]);
      expect([end.otherMotorNeurons, end.otherMotorSpikes]).toEqual([each.otherMotorNeurons, each.otherMotorSpikes]);
      // the busiest pool never holds most of the spikes of a whole recording, which is why the card does not say so
      if (end.busiest && end.motorSpikes > 10) expect(end.busiest.spikes * 2).toBeLessThan(end.motorSpikes);
      expect(r.sensors).toBe(new Set(Object.values(each.sensors).flat()).size);
      // nothing drives a motor neuron: no leg motor neuron is among the driven sensors
      const motor = new Set(index.movements.pools.flatMap((pool) => pool.bodyIds));
      expect(Object.values(each.sensors).flat().filter((body) => motor.has(body))).toEqual([]);
    }
  });
});
