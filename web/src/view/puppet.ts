// What every prop is doing at a moment of the ceremony. Pure: phase and progress in, numbers out. All of it is staged.
// One thing here is not free to move: the proboscis. Reaching for the tea is the model's decision, and until a recording
// carries one, he neither drinks nor refuses. So the cup stays full while he tastes and the sweets stay on the table.

import type { Phase } from "./loop";

export interface SipLook { teaIndex: number | null; scoops: number; sweets: number; bitterLevel: number }

export interface Pose {
  walkTo: "tin" | "kettle" | "sifter" | "bowl" | "between" | "cup";
  tinLift: number;      // 0..1, the chosen tin off its shelf
  tinTilt: number;
  sifterOver: number;   // 0..1, the sifter's way from its rest to above the bowl
  grains: number;       // how many grains of powder are falling
  heap: number;         // 0..1, sifted powder lying in the bowl
  kettleOver: number;   // 0..1, the kettle's way to above the bowl
  whisking: number;     // 0..1
  bowlLevel: number;    // 0..1
  bowlTilt: number;     // 0..1
  mixed: number;        // 0 is clear water, 1 is the finished tea
  stream: boolean;      // tea falling from bowl to cup
  cupLevel: number;     // 0..1
  sweetsShown: number;
  lean: number;         // 0..1, how far he bends to the cup
  wipe: number;         // 0..1, the cloth's way to the bowl and back
  proboscis: 0;         // extension. Only a recording's outcome may ever change this.
}

export const ease = (x: number): number => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
const bump = (x: number): number => Math.sin(Math.PI * Math.min(1, Math.max(0, x)));
const there = (p: number, arrive: number, leave: number, span: number): number => ease(p / arrive) * (1 - ease((p - leave) / span));

export function pose(phase: Phase, p: number, sip: SipLook): Pose {
  const tea = sip.scoops > 0;
  const rest: Pose = {
    walkTo: "bowl", tinLift: 0, tinTilt: 0, sifterOver: 0, grains: 0, heap: 0, kettleOver: 0, whisking: 0, bowlLevel: 0, bowlTilt: 0,
    mixed: 0, stream: false, cupLevel: 0, sweetsShown: sip.sweets, lean: 0, wipe: 0, proboscis: 0,
  };
  switch (phase) {
    case "select":
      return { ...rest, walkTo: tea ? "tin" : "kettle", tinLift: tea ? ease(p * 1.6) : 0, tinTilt: tea ? bump(p) : 0 };
    case "sift":
      return {
        ...rest, walkTo: "sifter", tinLift: tea ? 1 - ease(p * 2) : 0,
        sifterOver: tea ? there(p, 0.25, 0.85, 0.15) : 0,
        grains: tea && p > 0.2 && p < 0.85 ? 9 * sip.scoops : 0,
        heap: tea ? ease((p - 0.2) / 0.65) : 0,
      };
    case "brew":
      return {
        ...rest, kettleOver: there(p, 0.15, 0.27, 0.15), bowlLevel: ease((p - 0.1) / 0.17), heap: tea ? 1 - ease((p - 0.1) / 0.17) : 0,
        whisking: there(p - 0.4, 0.15, 0.45, 0.15), mixed: ease((p - 0.4) / 0.5),
      };
    case "pour": {
      const poured = ease((p - 0.25) / 0.55);
      return { ...rest, walkTo: "between", bowlTilt: bump(p), bowlLevel: 1 - poured, cupLevel: poured, mixed: 1, stream: p > 0.25 && p < 0.8 };
    }
    case "taste":
      return { ...rest, walkTo: "cup", cupLevel: 1, mixed: 1, lean: there(p, 1 / 3, 0.85, 0.15) };
    case "clean":
      return { ...rest, cupLevel: 1 - ease(p * 2.5), mixed: 1, wipe: bump(p), sweetsShown: 0 };
  }
}
