// The only neural activity on the page. Rule 2 lives or dies here: which neurons the tea drives, with which seed,
// for how long, and when his lips are lit.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Codec } from "../src/codec/codec";
import { InputLayer, type Spikes } from "../src/engine/input";
import type { CloudInfo } from "../src/view/cloud";
import { light } from "../src/view/light";
import { lipLayout } from "../src/view/lips";
import { LiveLayer } from "../src/view/live";
import type { LoopState } from "../src/view/loop";
import { touchWindow } from "../src/view/puppet";

const root = new URL("../../", import.meta.url);
const codec: Codec = JSON.parse(readFileSync(new URL("contracts/codec/taste.codec.json", root), "utf8"));
const info: CloudInfo = JSON.parse(readFileSync(new URL("data/built/web/brain.cloud.json", root), "utf8"));
const dots = lipLayout(info.mouthparts);
const options = { stepsPerSecond: 200, lightWindowSteps: 60, slowdown: 50 };
const tea = { teaId: codec.menu.teas[0].id, scoops: 3, sweets: 0 };
const sweetsOnly = { teaId: null, scoops: 0, sweets: 4 };
const moment = (seconds: number, t: number, more: Partial<LoopState> = {}): LoopState =>
  ({ sipIndex: 5, phase: "taste", progress: t / seconds, phaseSeconds: seconds, paused: false, ...more });

describe("the live layer", () => {
  const [from, to] = touchWindow(12);

  it("is silent and dark outside tasting and before his lips touch the tea", () => {
    const layer = new LiveLayer(codec, dots, options);
    for (const state of [moment(12, 6, { phase: "pour" }), moment(12, from - 0.05)]) {
      const { live, glow } = layer.at(state, tea);
      expect(live).toBeNull();
      expect(Array.from(glow).every((v) => v === 0)).toBe(true);
    }
  });

  it("drives sweet neurons with the sweet level and bitter neurons with the bitter level, never the other way round", () => {
    const sweet = new LiveLayer(codec, dots, options).at(moment(12, to), sweetsOnly).live!;
    expect(sweet.sweetSpikes).toBeGreaterThan(500);
    expect(sweet.bitterSpikes).toBe(0); // a threshold of zero never fires
    const bitter = new LiveLayer(codec, dots, options).at(moment(12, to), tea).live!;
    expect(bitter.bitterSpikes).toBeGreaterThan(100);
    expect(bitter.sweetSpikes).toBe(0);
  });

  it("uses the bowl's index as its seed and gives exactly the spikes the engine forces for it", () => {
    const layer = new LiveLayer(codec, dots, options);
    const { live } = layer.at(moment(12, from + 1), sweetsOnly);
    expect(live).toMatchObject({ seed: 5, steps: 200, slowdown: 50, touching: true });
    const expected: Spikes = { spikeStep: [], spikeBodyId: [] };
    const sweetThr16 = codec.channels.find((c) => c.id === "sweet")!.levels[4].thr16;
    new InputLayer(5, dots.map((d) => ({ bodyId: d.bodyId, thr16: d.group === "grn.sweet" ? sweetThr16 : 0 }))).run(0, 200, expected);
    expect(live!.sweetSpikes).toBe(expected.spikeStep.length);
    // another bowl is another seed and another train; totals can coincide, so compare which dots are lit
    const here = layer.at(moment(12, from + 1), sweetsOnly).glow;
    const other = new LiveLayer(codec, dots, options).at(moment(12, from + 1, { sipIndex: 6 }), sweetsOnly);
    expect(other.live!.seed).toBe(6);
    expect(Array.from(other.glow)).not.toEqual(Array.from(here));
  });

  it("gives the same totals whether it is asked frame by frame or once, and starts again when the clock goes back", () => {
    const framed = new LiveLayer(codec, dots, options);
    let last = framed.at(moment(12, from), tea).live!;
    for (let t = from; t <= to; t += 1 / 60) last = framed.at(moment(12, t), tea).live!;
    last = framed.at(moment(12, to), tea).live!;
    const once = new LiveLayer(codec, dots, options).at(moment(12, to), tea).live!;
    expect(last).toEqual(once);
    expect(framed.at(moment(12, from + 0.5), tea).live!.steps).toBe(100); // a still, or a seek backwards
    expect(framed.at(moment(12, from + 0.5), tea).live!.bitterSpikes).toBeLessThan(once.bitterSpikes);
  });

  it("stops forcing spikes when his lips leave the tea, and keeps the totals for the card", () => {
    const layer = new LiveLayer(codec, dots, options);
    const atEnd = layer.at(moment(12, to), tea).live!;
    const after = layer.at(moment(12, to + 1.5), tea);
    expect(after.live).toEqual({ ...atEnd, touching: false });
    expect(Array.from(after.glow).every((v) => v === 0)).toBe(true);
  });

  it("is dark, and says his lips are off the tea, whenever the ceremony's clock is held", () => {
    const layer = new LiveLayer(codec, dots, options);
    const running = layer.at(moment(12, from + 2), sweetsOnly);
    expect(running.live!.touching).toBe(true);
    expect(Array.from(running.glow).some((v) => v > 0)).toBe(true);
    const held = layer.at(moment(12, from + 2, { paused: true }), sweetsOnly);
    expect(held.live).toEqual({ ...running.live!, touching: false });
    expect(Array.from(held.glow).every((v) => v === 0)).toBe(true);
  });

  it("lights a dot by that neuron's own spikes in the window, counted the slow way", () => {
    const layer = new LiveLayer(codec, dots, options);
    const { live, glow } = layer.at(moment(12, from + 1.2), sweetsOnly);
    const all: Spikes = { spikeStep: [], spikeBodyId: [] };
    const sweetThr16 = codec.channels.find((c) => c.id === "sweet")!.levels[4].thr16;
    new InputLayer(5, dots.map((d) => ({ bodyId: d.bodyId, thr16: d.group === "grn.sweet" ? sweetThr16 : 0 }))).run(0, live!.steps, all);
    dots.forEach((dot, i) => {
      const slow = all.spikeStep.filter((step, k) => all.spikeBodyId[k] === dot.bodyId && step > live!.steps - 60 && step <= live!.steps).length;
      expect(glow[i], dot.bodyId).toBe(slow);
    });
    // and light() itself against a brute-force count, for three neurons over two hundred steps
    const three: Spikes = { spikeStep: [], spikeBodyId: [] };
    new InputLayer(9, [{ bodyId: "7", thr16: 6000 }, { bodyId: "99", thr16: 3000 }, { bodyId: "4294967303", thr16: 9000 }]).run(0, 200, three);
    const index = new Map([["7", 0], ["99", 1], ["4294967303", 2]]);
    for (const [tStep, window] of [[199, 60], [60, 60], [10, 100], [150, 1]]) {
      const counted = [0, 0, 0];
      three.spikeStep.forEach((step, k) => { if (step > tStep - window && step <= tStep) counted[index.get(three.spikeBodyId[k])!] += 1; });
      expect(Array.from(light(3, index, three, tStep, window))).toEqual(counted);
    }
  });
});
