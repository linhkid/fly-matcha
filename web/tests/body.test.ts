// His body over whole bowls and breaks, frame by frame. The promise of slice V3 is held here where it is decided:
// whenever a knee of his moves, gait.ts says that pair of legs is moving, so its sensors are driven; and whenever
// gait.ts says a pair is moving, its knees do move. A claim without a movement would be light without a cause.
import { describe, expect, it } from "vitest";
import { AT, Body } from "../src/view/body";
import { legAngles, movementOf, type FlyMotion, type LegPlan } from "../src/view/gait";
import { Loop, type Phase } from "../src/view/loop";
import { pose, type SipLook } from "../src/view/puppet";

const FRAME = 1 / 60;
const legs: LegPlan[] = [0, 1, 2].flatMap((pair) => [0, 1].map((side) => ({ pair, tripod: (pair + side) % 2, restYaw: 0.4 - 0.5 * pair })));
const tea: SipLook = { teaIndex: 2, scoops: 2, sweets: 1, bitterLevel: 3 };
const water: SipLook = { teaIndex: null, scoops: 0, sweets: 2, bitterLevel: 0 };

interface Frame { motion: FlyMotion; phase: Phase; resting: boolean }

/** One bowl and the walk into the next, at sixty frames a second, with a break of `breakSeconds` taken at a moment of the ceremony. */
function bowl(sip: SipLook, rest: { phase: Phase; at: number; seconds: number } | null): Frame[] {
  const loop = new Loop();
  const body = new Body();
  const frames: Frame[] = [];
  let resting = false;
  let rested = 0;
  let taken = false;
  for (let i = 0, t = 0; i < 60 * 90 && loop.state().sipIndex < 1 || (loop.state().sipIndex === 1 && loop.state().phase === "select" && loop.state().progress < 0.9); i++, t += FRAME) {
    if (!resting && loop.state().paused && body.atWork) loop.resume();   // main.ts's rule: the clock runs again only when he is back at his work
    const state = loop.tick(FRAME);
    if (rest && !taken && state.sipIndex === 0 && state.phase === rest.phase && state.progress >= rest.at) { taken = true; resting = true; loop.pause(); }
    if (resting) { rested += FRAME; if (rested >= rest!.seconds) resting = false; }
    const { motion } = body.step({ work: pose(state.phase, state.progress, sip, state.phaseSeconds, 0), tinX: AT.tins + 0.6, resting, t, proboscis: 0, still: null }, FRAME);
    frames.push({ motion, phase: state.phase, resting });
  }
  return frames;
}

/** Runs of frames with the same claim, and how far each leg's knee travelled within each run. */
function runs(frames: Frame[]): { claim: string; seconds: number; kneeTravel: number[]; phase: Phase }[] {
  const out: { claim: string; seconds: number; kneeTravel: number[]; phase: Phase }[] = [];
  let before: number[] | null = null;
  for (const frame of frames) {
    const claim = movementOf(frame.motion) ?? "none";
    const bends = legs.map((leg) => legAngles(frame.motion, leg).bend);
    if (!out.length || out[out.length - 1].claim !== claim) out.push({ claim, seconds: 0, kneeTravel: legs.map(() => 0), phase: frame.phase });
    const run = out[out.length - 1];
    run.seconds += FRAME;
    if (before) bends.forEach((bend, k) => (run.kneeTravel[k] += Math.abs(bend - before![k])));
    before = bends;
  }
  return out;
}

const scenarios: [string, SipLook, { phase: Phase; at: number; seconds: number } | null][] = [
  ["a bowl of tea", tea, null],
  ["a bowl of hot water", water, null],
  ...(["select", "sift", "brew", "pour", "taste", "clean"] as Phase[]).flatMap((phase) => [0.12, 0.5, 0.85].map((at) =>
    [`a break at ${phase} ${at}`, tea, { phase, at, seconds: 4 }] as [string, SipLook, { phase: Phase; at: number; seconds: number }])),
];

describe("his body, frame by frame", () => {
  it.each(scenarios)("%s: no knee moves unclaimed, beyond what cannot be seen", (_name, sip, rest) => {
    for (const run of runs(bowl(sip, rest))) {
      if (run.claim !== "none") continue;
      // a twentieth of a movement is not claimed (gait.ts), and that lets a knee travel a few hundredths of a radian
      expect(Math.max(...run.kneeTravel), `${run.phase}, ${run.seconds.toFixed(2)} s of stillness`).toBeLessThan(0.06);
    }
  });

  it.each(scenarios)("%s: a claim that lasts is a movement of those knees", (_name, sip, rest) => {
    for (const run of runs(bowl(sip, rest))) {
      if (run.seconds < 0.3) continue;
      const [front, others] = [run.kneeTravel.slice(0, 2), run.kneeTravel.slice(2)];
      if (run.claim === "front") {
        expect(Math.min(...front), `front, ${run.phase}`).toBeGreaterThan(0.03);
        expect(Math.max(...others), `front, ${run.phase}: the other four legs stand`).toBeLessThan(0.06);
      }
      if (run.claim === "walk") expect(Math.min(...run.kneeTravel), `walk, ${run.phase}`).toBeGreaterThan(0.03);
    }
  });

  it("claims every kind of movement somewhere in a bowl, and stillness too", () => {
    const seen = new Set(runs(bowl(tea, { phase: "brew", at: 0.5, seconds: 4 })).map((run) => run.claim));
    expect([...seen].sort()).toEqual(["front", "none", "walk"]);
  });

  it("holds everything in a frame with no time in it, and refuses time that runs backwards", () => {
    const body = new Body();
    const wish = { work: pose("brew", 0.1, tea, 4.5, 0), tinX: AT.tins, resting: false, t: 0, proboscis: 0, still: null };
    for (let i = 0; i < 20; i++) body.step(wish, FRAME);                       // he is on his way to the bowl
    const walking = body.step(wish, FRAME).motion;
    expect(movementOf(walking)).toBe("walk");
    const paused = body.step(wish, 0).motion;
    expect(paused).toEqual(walking);                                           // a viewer's pause: the same walk, the same legs, the same claim
    expect(() => body.step(wish, -0.01)).toThrow(/forwards/);
  });

  it("in a still, takes whether he is lifting from the ceremony, and does not march on the spot", () => {
    const body = new Body();
    const wish = { work: pose("taste", 0.2, tea, 10, 0), tinX: AT.tins, resting: false, t: 0, proboscis: 0, still: { lifting: false } };
    const first = body.settle(wish).motion;
    expect(first.lean).toBeGreaterThan(0.02);
    expect(first.lean).toBeLessThan(0.98);
    expect(movementOf(first)).toBe("walk");                                     // stepping up to the cup
    expect(body.step(wish, FRAME).motion.stride).toBe(first.stride);            // two shots of one address are the same shot
    const lifting = new Body().settle({ ...wish, work: pose("select", 0.45, tea, 3.5, 0), still: { lifting: true } }).motion;
    expect(movementOf(lifting)).toBe("front");
  });
});
