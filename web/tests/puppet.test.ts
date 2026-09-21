// The ceremony's poses. Staged, but not free to lie: with no recording he neither drinks nor refuses.
import { describe, expect, it } from "vitest";
import { PHASES } from "../src/view/loop";
import { bookAt, BOOKS, onBreak, pose, touchWindow, type Pose, type SipLook } from "../src/view/puppet";

const STAYS = [8, 9.5, 12, 14.25, 20]; // his brain sets the stay, anywhere from the least to the most
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
    const smooth: (keyof Pose)[] = ["tinLift", "sifterOver", "heap", "kettleOver", "whisking", "bowlLevel", "bowlTilt", "cupLevel", "lean", "wipe", "cupTip"];
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

  it("leaves in the cup what the replay says he has not drunk, and tips out only that", () => {
    const sip = sips[0];
    expect(pose("taste", 0.5, sip, 12, 0.4).cupLevel).toBeCloseTo(0.6);
    expect(pose("taste", 0.5, sip, 12).cupLevel).toBe(1);                       // nothing handed in: nothing drunk
    expect(pose("clean", 0, sip, 3.5, 0.4).cupLevel).toBeCloseTo(0.6);          // cleaning starts from what is left
    expect(pose("clean", 0.5, sip, 3.5, 0.4).cupLevel).toBe(0);
    expect(pose("taste", 0.5, sip, 12, 7).cupLevel).toBe(0);                    // never below empty
    for (const phase of PHASES) expect(pose(phase, 0.5, sip, 12, 0.4).proboscis).toBe(0);   // the staging still never moves it
  });

  it("fills the bowl before whisking, moves all of it to the cup, and tips the cup out while cleaning", () => {
    const sip = sips[0];
    expect(pose("brew", 0.3, sip).bowlLevel).toBe(1);
    expect(pose("brew", 0.2, sip).whisking).toBe(0);
    expect(pose("brew", 0.6, sip).whisking).toBe(1);
    expect(pose("pour", 0.9, sip)).toMatchObject({ bowlLevel: 0, cupLevel: 1 });
    expect(pose("clean", 0.5, sip).cupLevel).toBe(0);
    // the cup is emptied by tipping it out, and the sweets are carried off: neither simply vanishes
    expect(pose("clean", 0.2, sip).cupTip).toBeGreaterThan(0.9);
    expect(pose("clean", 0.2, sip).cupLevel).toBeGreaterThan(0.3);
    expect(pose("clean", 0.3, sip)).toMatchObject({ sweetsShown: sip.sweets, sweetsAway: 0 });
    expect(pose("clean", 0.95, sip).sweetsAway).toBeGreaterThan(0.95);
  });

  it("sifts nothing and lifts no tin when the sip is hot water", () => {
    for (const p of steps) {
      expect(pose("select", p, sips[1])).toMatchObject({ walkTo: "kettle", tinLift: 0 });
      expect(pose("sift", p, sips[1])).toMatchObject({ sifterOver: 0, grains: 0, heap: 0 });
    }
  });
});

describe("a break", () => {
  it("puts down everything that was in the air, and neither pours, drinks nor spills", () => {
    for (const sip of sips) {
      for (const phase of PHASES) {
        for (const p of steps) {
          const working = pose(phase, p, sip);
          const reading = onBreak(working, 1);
          expect(reading).toMatchObject({ tinLift: 0, tinTilt: 0, sifterOver: 0, kettleOver: 0, whisking: 0, bowlTilt: 0, lean: 0, wipe: 0, cupTip: 0, grains: 0, stream: false, touching: false, proboscis: 0 });
          for (const kept of ["bowlLevel", "cupLevel", "heap", "mixed", "sweetsShown", "sweetsAway", "walkTo"] as const) expect(reading[kept]).toBe(working[kept]);
          expect(onBreak(working, 0)).toEqual(working);
          for (const b of [0.01, 0.5, 0.99]) {
            const between = onBreak(working, b);
            expect(between).toMatchObject({ grains: 0, stream: false, touching: false, proboscis: 0, cupLevel: working.cupLevel, bowlLevel: working.bowlLevel });
            for (const held of ["tinLift", "sifterOver", "kettleOver", "whisking", "bowlTilt", "lean", "wipe", "cupTip"] as const) {
              expect(between[held]).toBeLessThanOrEqual(working[held]);
              expect(between[held]).toBeGreaterThanOrEqual(0);
            }
          }
        }
      }
    }
  });

  it("gives him a different book as the sips go by and with every break, and comes back round to the first", () => {
    expect(BOOKS.length).toBe(12);
    expect(new Set(BOOKS.map((_, i) => bookAt(i))).size).toBe(BOOKS.length);
    expect(bookAt(BOOKS.length)).toBe(bookAt(0));
    for (let bowl = 0; bowl < 30; bowl++) {
      expect(new Set(BOOKS.map((_, visit) => bookAt(bowl, visit))).size).toBe(BOOKS.length);   // twelve breaks in one bowl: twelve books
      expect(bookAt(bowl, 4)).not.toBe(bookAt(bowl, 5));                                       // two breaks running are never the same book
    }
  });
});

describe("tasting, unhurried", () => {
  it("takes the same seconds to come and go however long he stays, so a longer taste is a longer stay", () => {
    const sip = sips[0];
    const stay = (seconds: number): number => steps.filter((p) => pose("taste", p, sip, seconds).touching).length * seconds / 100;
    for (const seconds of STAYS) {
      expect(pose("taste", 0.9 / seconds, sip, seconds).lean).toBe(0);            // first he looks at it
      expect(pose("taste", 3.5 / seconds, sip, seconds).touching).toBe(true);     // lowered by 3.4 s
      expect(pose("taste", (seconds - 0.7) / seconds, sip, seconds).lean).toBe(0); // and he is up before he leaves
      expect(stay(seconds)).toBeGreaterThan(seconds - 6.2);
      expect(stay(seconds)).toBeLessThan(seconds - 4.4);
      for (let i = 1; i < steps.length; i++) {
        const jump = Math.abs(pose("taste", steps[i], sip, seconds).lean - pose("taste", steps[i - 1], sip, seconds).lean);
        expect(jump / (seconds / 100), `${seconds} s at ${steps[i]}`).toBeLessThan(0.9); // never faster than this per second, however long the stay
      }
    }
  });

  it("knows between which seconds his lips are on the tea, from the lean itself", () => {
    for (const seconds of STAYS) {
      const [from, to] = touchWindow(seconds);
      expect(from).toBeGreaterThan(3);
      expect(from).toBeLessThan(3.4);
      expect(to).toBeGreaterThan(seconds - 2.6);
      expect(to).toBeLessThan(seconds - 2.3);
      expect(pose("taste", (from + 0.01) / seconds, sips[0], seconds).touching).toBe(true);
      expect(pose("taste", (from - 0.01) / seconds, sips[0], seconds).touching).toBe(false);
      expect(pose("taste", (to - 0.01) / seconds, sips[0], seconds).touching).toBe(true);
      expect(pose("taste", (to + 0.01) / seconds, sips[0], seconds).touching).toBe(false);
    }
  });

});
