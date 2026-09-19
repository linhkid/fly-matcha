// The browser's first piece of the neuron model, held to the fixtures the Python oracle wrote (slice 02).
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { InputLayer, type Spikes } from "../src/engine/input";
import { counterOf, lane16, threefry2x32 } from "../src/engine/prng";

const fixtures = new URL("../../contracts/fixtures/", import.meta.url);
const json = (path: string) => JSON.parse(readFileSync(new URL(path, fixtures), "utf8"));
const hex = (word: number): string => word.toString(16).padStart(8, "0");

describe("threefry2x32, 20 rounds", () => {
  const fixture = json("prng/threefry2x32-20-lane16.json");

  it("gives the three published answers", () => {
    expect(fixture.knownAnswers.length).toBe(3);
    for (const { counter, key, output } of fixture.knownAnswers) {
      const words = threefry2x32(parseInt(counter[0], 16), parseInt(counter[1], 16), parseInt(key[0], 16), parseInt(key[1], 16));
      expect(words.map(hex)).toEqual(output);
    }
  });

  it("gives the oracle's lane for every seed, body ID and step of the fixture, across 2^32 and across blocks of four", () => {
    expect(fixture.lanes.length).toBeGreaterThan(50);
    for (const { seed, bodyId, step, lane16: expected } of fixture.lanes) {
      const [low, high] = counterOf(bodyId);
      expect(lane16(seed, low, high, step), `seed ${seed}, body ${bodyId}, step ${step}`).toBe(expected);
    }
  });
});

describe("the spikes a drive forces", () => {
  const names = readdirSync(new URL("lif/", fixtures)).filter((name) => name.endsWith(".json"));
  const driven = names.map((name) => json(`lif/${name}`)).filter((f) => f.spec.drives.length > 0);

  it("are, in every driven fixture of the oracle, spikes of its recording; and all of them where input neurons receive no synapse", () => {
    expect(driven.length).toBeGreaterThanOrEqual(20);
    let exact = 0;
    for (const fixture of driven) {
      const bodyIds: string[] = fixture.graph.bodyId;
      const receives = new Set<number>(fixture.graph.target);
      const forced = new Set<string>();
      const inputs = new Set<string>();
      let inputsAreBare = true;
      for (const drive of fixture.spec.drives) {
        const group = fixture.groups[drive.group];
        const members = group.indices.filter((_: number, k: number) =>
          drive.side === "both" || (drive.side === "left" ? group.sides[k] === "L" : group.sides[k] === "R"));
        for (const index of members) { inputs.add(bodyIds[index]); if (receives.has(index)) inputsAreBare = false; }
        const out: Spikes = { spikeStep: [], spikeBodyId: [] };
        new InputLayer(fixture.spec.seed, members.map((index: number) => ({ bodyId: bodyIds[index], thr16: drive.thr16 })))
          .run(drive.onStep, Math.min(drive.offStep, fixture.spec.durationSteps), out);
        out.spikeStep.forEach((step, k) => forced.add(`${step}/${out.spikeBodyId[k]}`));
      }
      const recorded = new Set<string>();
      fixture.recording.spikeStep.forEach((step: number, k: number) => {
        if (inputs.has(fixture.recording.spikeBodyId[k])) recorded.add(`${step}/${fixture.recording.spikeBodyId[k]}`);
      });
      for (const spike of forced) expect(recorded.has(spike), `${fixture.fixture}: forced spike ${spike} is missing from the oracle's recording`).toBe(true);
      if (inputsAreBare) {
        expect([...recorded].sort()).toEqual([...forced].sort());
        if (fixture.spec.drives.length === 1) {   // and in the oracle's order: by step, then by ascending body ID
          const inOrder: string[] = [];
          fixture.recording.spikeStep.forEach((step: number, k: number) => { if (inputs.has(fixture.recording.spikeBodyId[k])) inOrder.push(`${step}/${fixture.recording.spikeBodyId[k]}`); });
          const drive = fixture.spec.drives[0];
          const again: Spikes = { spikeStep: [], spikeBodyId: [] };
          new InputLayer(fixture.spec.seed, [...inputs].map((bodyId) => ({ bodyId, thr16: drive.thr16 }))).run(drive.onStep, Math.min(drive.offStep, fixture.spec.durationSteps), again);
          expect(again.spikeStep.map((step, k) => `${step}/${again.spikeBodyId[k]}`)).toEqual(inOrder);
        }
        exact += 1;
      }
    }
    expect(exact).toBeGreaterThanOrEqual(15);
  });

  it("keeps nothing between calls: a run taken in ragged pieces, as the page takes it frame by frame, is the run taken whole", () => {
    const neurons = [{ bodyId: "7", thr16: 1310 }, { bodyId: "4294967303", thr16: 655 }];
    const whole: Spikes = { spikeStep: [], spikeBodyId: [] };
    new InputLayer(26, neurons).run(0, 1670, whole);
    const layer = new InputLayer(26, neurons);
    const pieces: Spikes = { spikeStep: [], spikeBodyId: [] };
    let at = 0;
    for (const edge of [1, 3, 4, 5, 17, 203, 999, 1670]) { layer.run(at, edge, pieces); at = edge; }
    expect(pieces).toEqual(whole);
    expect(whole.spikeStep.length).toBeGreaterThan(20);
  });

  it("lists the spikes of a step by ascending body ID, never fires at threshold zero, and refuses a seed or threshold out of range", () => {
    const out: Spikes = { spikeStep: [], spikeBodyId: [] };
    new InputLayer(7, [{ bodyId: "4294967303", thr16: 0xffff }, { bodyId: "7", thr16: 0xffff }, { bodyId: "99", thr16: 0 }]).run(0, 2, out);
    expect(out).toEqual({ spikeStep: [0, 0, 1, 1], spikeBodyId: ["7", "4294967303", "7", "4294967303"] });
    // ascending body ID is not ascending low word: 2^32 has a low word of zero and still comes after 5
    const pair: Spikes = { spikeStep: [], spikeBodyId: [] };
    new InputLayer(7, [{ bodyId: "4294967296", thr16: 0xffff }, { bodyId: "5", thr16: 0xffff }]).run(0, 1, pair);
    expect(pair.spikeBodyId).toEqual(["5", "4294967296"]);
    expect(() => new InputLayer(-1, [])).toThrow("seed");
    expect(() => new InputLayer(1.5, [])).toThrow("seed");
    for (const thr16 of [-1, 0.5]) expect(() => new InputLayer(1, [{ bodyId: "1", thr16 }])).toThrow("thr16");
    for (const bodyId of ["", " 7 ", "0x10", "-1", "07", "18446744073709551616"]) expect(() => new InputLayer(1, [{ bodyId, thr16: 1 }]), bodyId).toThrow("body ID");
    expect(() => new InputLayer(1, [{ bodyId: "7", thr16: 1 }, { bodyId: "7", thr16: 2 }])).toThrow("driven twice");
    expect(new InputLayer(1, [{ bodyId: "18446744073709551615", thr16: 0xffff }])).toBeInstanceOf(InputLayer);
    for (const [a, b] of [[-1, 2], [0.5, 2], [3, 2], [0, 2.5]]) expect(() => new InputLayer(1, []).run(a, b, { spikeStep: [], spikeBodyId: [] })).toThrow("no such steps");
    expect(() => new InputLayer(2 ** 32, [])).toThrow("seed");
    expect(() => new InputLayer(1, [{ bodyId: "1", thr16: 65536 }])).toThrow("thr16");
  });
});
