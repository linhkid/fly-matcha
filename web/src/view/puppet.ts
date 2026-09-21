// What every prop is doing at a moment of the ceremony. Pure: phase and progress in, numbers out. All of it is staged.
// One thing here is not free to move: the proboscis, and with it the tea he drinks. `pose()` never extends the one or
// drains the other. How much he has drunk is handed in, and comes from the replay of a recording, and only when the
// experiment that licenses drinking has passed (contracts/mechanics.json). With nothing handed in, the cup stays full.
// The rest of this note is from the slice in which nothing was licensed yet:
// One thing here is not free to move: the proboscis. Reaching for the tea is the model's decision, and until a recording
// carries one, he neither drinks nor refuses. So the cup stays full while he tastes and the sweets stay on the table.

import { PHASE_SECONDS, type Phase } from "./loop";

export interface SipLook { teaIndex: number | null; scoops: number; sweets: number; bitterLevel: number }

export interface Pose {
  walkTo: "tin" | "kettle" | "sifter" | "bowl" | "cup";
  tinLift: number;      // 0..1, the chosen tin off its shelf
  tinTilt: number;
  sifterOver: number;   // 0..1, the sifter's way from its rest to above the bowl
  grains: number;       // how many grains of powder are falling
  heap: number;         // 0..1, sifted powder lying in the bowl
  kettleOver: number;   // 0..1, the kettle's way to above the bowl; water runs while it is all the way there
  whisking: number;     // 0..1
  bowlLevel: number;    // 0..1
  bowlTilt: number;     // 0..1
  mixed: number;        // 0 is clear water, 1 is the finished tea
  stream: boolean;      // tea falling from bowl to cup
  cupLevel: number;     // 0..1
  sweetsShown: number;
  lean: number;         // 0..1, how far he has come to the cup and lowered his head. At 1 his lips touch the tea.
  touching: boolean;    // lips on the tea: the stimulus. Not drinking.
  wipe: number;         // 0..1, the cloth's way to the bowl and back
  cupTip: number;       // 0..1, the cup tipped out while he cleans up: what was not drunk is poured away, in plain sight
  sweetsAway: number;   // 0..1, the sweets carried off the table while he cleans up: cleared, not eaten
  proboscis: 0;         // extension. Only a recording's outcome may ever change this.
}

export const ease = (x: number): number => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
const bump = (x: number): number => Math.sin(Math.PI * Math.min(1, Math.max(0, x)));
const there = (p: number, arrive: number, leave: number, span: number): number => ease(p / arrive) * (1 - ease((p - leave) / span));

// Tasting is deliberate. He stands before the cup, lowers his head slowly, stays, and takes his time coming up.
// The coming and going always take the same seconds; when the phase is longer it is the staying that grows.
const TASTE = { look: 1.0, lower: 2.4, rise: 1.8, after: 0.8 };

const leanAt = (t: number, phaseSeconds: number): number =>
  ease((t - TASTE.look) / TASTE.lower) * (1 - ease((t - (phaseSeconds - TASTE.after - TASTE.rise)) / TASTE.rise));
const TOUCH = 0.98; // of the way down, his lips are on the tea

/** The seconds of a taste phase between which his lips are on the tea. Found from the lean itself, so the two cannot drift apart. */
export function touchWindow(phaseSeconds: number): [number, number] {
  const edge = (from: number, to: number): number => {
    let [outside, inside] = [from, to]; // lean < TOUCH at `outside`, >= TOUCH at `inside`
    for (let i = 0; i < 40; i++) {
      const middle = (outside + inside) / 2;
      if (leanAt(middle, phaseSeconds) >= TOUCH) inside = middle; else outside = middle;
    }
    return inside;
  };
  const middle = phaseSeconds / 2;
  return [edge(0, middle), edge(phaseSeconds, middle)];
}

export function pose(phase: Phase, p: number, sip: SipLook, phaseSeconds: number = PHASE_SECONDS[phase], drunk = 0): Pose {
  const left = 1 - Math.min(1, Math.max(0, drunk));   // of the cup, after what the replay says he drank
  const tea = sip.scoops > 0;
  const rest: Pose = {
    walkTo: "bowl", tinLift: 0, tinTilt: 0, sifterOver: 0, grains: 0, heap: 0, kettleOver: 0, whisking: 0, bowlLevel: 0, bowlTilt: 0,
    mixed: 0, stream: false, cupLevel: 0, sweetsShown: sip.sweets, lean: 0, touching: false, wipe: 0, cupTip: 0, sweetsAway: 0, proboscis: 0,
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
      return { ...rest, bowlTilt: bump(p), bowlLevel: 1 - poured, cupLevel: poured, mixed: 1, stream: p > 0.25 && p < 0.8 };
    }
    case "taste": {
      const lean = leanAt(p * phaseSeconds, phaseSeconds);
      return { ...rest, walkTo: "cup", cupLevel: left, mixed: 1, lean, touching: lean >= TOUCH };
    }
    case "clean":
      return { ...rest, cupLevel: left * (1 - ease((p - 0.08) / 0.3)), cupTip: there(p, 0.2, 0.4, 0.2), mixed: 1, wipe: bump(p), sweetsAway: ease((p - 0.45) / 0.45) };
  }
}

/**
 * A break. Pausing does not freeze the room: he puts down whatever is in the air and goes to read.
 * `b` runs from 0, at work, to 1, reading. Only what was being held moves; no tea appears, is drunk or is spilled by a break.
 */
/** How far he has something off the table: the tin, the kettle, the bowl or the cup. His front legs go up and come down with it. */
export const carrying = (at: Pose): number => Math.max(at.tinLift, at.kettleOver, at.bowlTilt, at.cupTip);

export function onBreak(at: Pose, b: number): Pose {
  const work = 1 - ease(b);
  return {
    ...at,
    tinLift: at.tinLift * work, tinTilt: at.tinTilt * work, sifterOver: at.sifterOver * work, kettleOver: at.kettleOver * work,
    whisking: at.whisking * work, bowlTilt: at.bowlTilt * work, lean: at.lean * work, wipe: at.wipe * work, touching: b > 0 ? false : at.touching,
    cupTip: at.cupTip * work,
    grains: b > 0 ? 0 : at.grains, stream: b > 0 ? false : at.stream,
  };
}

// What he reads on a break. Titles only: not a line of any of them is quoted anywhere.
export const BOOKS = ["Crime and Punishment", "The Idiot", "Demons", "The Brothers Karamazov", "Notes from Underground", "White Nights", "Poor Folk", "The Double", "The Gambler", "The House of the Dead", "The Adolescent", "The Dream of a Ridiculous Man"] as const;
/** The book he picks up. It changes with the bowl and with every break he is sent on, so two breaks in a row are never the same book. */
export const bookAt = (sipIndex: number, visit = 0): string => BOOKS[(sipIndex * 5 + visit * 7) % BOOKS.length];   // five and seven share nothing with twelve, so either walk visits every book
