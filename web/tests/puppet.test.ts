// The ceremony's poses. Staged, but not free to lie: with no recording he neither drinks nor refuses.
import { describe, expect, it } from "vitest";
import { PHASES } from "../src/view/loop";
import { pose, type Pose, type SipLook } from "../src/view/puppet";

const sips: SipLook[] = [
  { teaIndex: 2, scoops: 3, sweets: 2, bitterLevel: 3 },
  { teaIndex: null, scoops: 0, sweets: 4, bitterLevel: 0 },
];
const steps = Array.from({ length: 101 }, (_, i) => i / 100);

describe("the ceremony's poses", () => {
  it("never moves the proboscis, never drains the cup while he tastes, and leaves the sweets on the table", () => {
    for (const sip of sips) {
      for (const phase of PHASES) for (const p of steps) expect(pose(phase, p, sip).proboscis).toBe(0);
      for (const p of steps) {
        const tasting = pose("taste", p, sip);
        expect(tasting.cupLevel).toBe(1);
        expect(tasting.sweetsShown).toBe(sip.sweets);
      }
    }
  });

  it("has no jumps: every level at the end of a phase is where the next phase picks it up", () => {
    const smooth: (keyof Pose)[] = ["tinLift", "sifterOver", "heap", "kettleOver", "whisking", "bowlLevel", "bowlTilt", "cupLevel", "lean", "wipe"];
    for (const sip of sips) {
      PHASES.forEach((phase, i) => {
        const end = pose(phase, 0.9999, sip);
        const next = pose(PHASES[(i + 1) % PHASES.length], 0, sip);
        for (const key of smooth) expect(Math.abs((end[key] as number) - (next[key] as number)), `${phase} → next, ${key}`).toBeLessThan(0.01);
      });
      for (const phase of PHASES) {
        for (let i = 1; i < steps.length; i++) {
          const a = pose(phase, steps[i - 1], sip);
          const b = pose(phase, steps[i], sip);
          for (const key of smooth) expect(Math.abs((a[key] as number) - (b[key] as number)), `${phase} at ${steps[i]}, ${key}`).toBeLessThan(0.12);
        }
      }
    }
  });

  it("fills the bowl before whisking, moves all of it to the cup, and tips the cup out while cleaning", () => {
    const sip = sips[0];
    expect(pose("brew", 0.3, sip).bowlLevel).toBe(1);
    expect(pose("brew", 0.2, sip).whisking).toBe(0);
    expect(pose("brew", 0.6, sip).whisking).toBe(1);
    expect(pose("pour", 0.9, sip)).toMatchObject({ bowlLevel: 0, cupLevel: 1 });
    expect(pose("clean", 0.5, sip).cupLevel).toBe(0);
  });

  it("sifts nothing and lifts no tin when the sip is hot water", () => {
    for (const p of steps) {
      expect(pose("select", p, sips[1])).toMatchObject({ walkTo: "kettle", tinLift: 0 });
      expect(pose("sift", p, sips[1])).toMatchObject({ sifterOver: 0, grains: 0, heap: 0 });
    }
  });
});
