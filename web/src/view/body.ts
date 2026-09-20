// Where he is and what his body is doing: the walk between the places of his work, sitting down to read, picking his
// work up again, and what his front legs have to do. Pure: no three.js, no DOM, no clock of its own. All of it is staged.
// It is kept apart from the drawing because its answer, a FlyMotion, decides which of his knee sensors are driven
// (gait.ts, movement.ts), and that must be testable over whole bowls and breaks: a knee that moves is claimed, and a
// claim is a knee that moves.

import { carrying, onBreak, type Pose } from "./puppet";
import type { FlyMotion } from "./gait";

// He walks along the back of the table; everything he uses stands in front of him, so that nothing hides behind his body.
export const AT = { tins: -4.45, kettle: -1.85, sifter: -1.15, bowl: -0.3, cup: 1.15, cloth: 1.95, cushion: 2.1 };
export const WALK_Z = -0.75;
export const FRONT_Z = 0.45;  // the bowl, the kettle when it pours, the cup
// He comes to the cup at an angle, so that his lips at the tea can be seen from the room and are not hidden behind his face.
export const TASTE_YAW = 0.7;
const REACH = 0.46; // from the middle of his thorax to his lips, along the way he faces, with his head down
export const TASTE_STEP = (FRONT_Z - WALK_Z) / Math.cos(TASTE_YAW) - REACH;       // how far he steps up: his lips end above the middle of the cup
export const CUP_STAND = AT.cup - Math.sin(TASTE_YAW) * (REACH + TASTE_STEP);     // where on his walking line he turns towards it
const WALK_SPEED = 1.7;  // table units a second
const TURN_SPEED = 7;    // radians a second
const STRIDE = 11;       // radians of gait for every unit walked
const PICK_UP_SECONDS = 0.8;   // putting his work down for a break, and picking it up again
const LIFT_RATE = 0.05;        // of the way up, a second: slower than this, what he holds is being held, not lifted

/** One frame's wishes. `work` is the ceremony's pose, before any break; `tinX` is where today's tin stands. */
export interface Wish {
  work: Pose; tinX: number; resting: boolean; t: number; proboscis: number;
  /** In a still no time passes between frames, so whether he is lifting is read off the ceremony a moment later and handed in. */
  still: { lifting: boolean } | null;
}

export class Body {
  x = AT.tins;
  yaw = 0;
  stride = 0;
  reading = 0;
  rest = 0;               // 0 at work, 1 with everything put down
  atStation = true;       // he stands where his work is, facing it
  private resting = false;
  private walking = 0;
  private sifting = 0;
  private held = 0;
  private lifting = 0;

  /** He is back: at his station, facing his work, with it picked up again. Only then may the ceremony's clock run. */
  get atWork(): boolean {
    return !this.resting && this.atStation && this.rest === 0;
  }

  /** Put him where a moment has him, with no walk there. For stills. */
  settle(wish: Wish): { at: Pose; motion: FlyMotion } {
    this.resting = wish.resting;
    this.rest = wish.resting ? 1 : 0;
    this.reading = 0; // so that nothing keeps him sitting
    this.step(wish, 10); // he turns and walks all the way
    this.step(wish, 10); // and turns to face his work, or sits down
    const lean = onBreak(wish.work, this.rest).lean;
    this.walking = lean > 0.02 && lean < 0.98 ? 0.6 : 0;    // he has arrived, and is standing unless this is the moment he steps up to the cup
    this.reading = wish.resting ? 1 : 0;
    return this.step(wish, 0);
  }

  /** One frame of `dt` seconds. A frame with no time in it moves nothing and changes nothing: a paused walk stays a walk. */
  step(wish: Wish, dt: number): { at: Pose; motion: FlyMotion } {
    if (!(dt >= 0)) throw new Error(`time runs forwards here: ${dt}`); // a negative step would turn him by a rate times a negative time
    this.resting = wish.resting;
    this.rest = Math.min(1, Math.max(0, this.rest + (wish.resting ? dt : this.atStation ? -dt : 0) / PICK_UP_SECONDS));
    const at = onBreak(wish.work, this.rest);
    const station = { tin: wish.tinX, kettle: AT.kettle, sifter: AT.sifter, bowl: AT.bowl, cup: CUP_STAND }[at.walkTo];
    const walkTo = wish.resting ? AT.cushion : station;
    const stand = !wish.resting && at.walkTo === "cup" ? TASTE_YAW : 0; // the way he faces once he is there

    // he turns to where he is going, walks there on an alternating tripod, and turns back to face his work
    const away = walkTo - this.x;
    const seated = this.reading > 0.05 && !wish.resting; // he shuts his book before he gets up
    const facing = seated ? this.yaw : Math.abs(away) > 0.03 ? Math.sign(away) * (Math.PI / 2) : stand;
    const turn = Math.max(-TURN_SPEED * dt, Math.min(TURN_SPEED * dt, facing - this.yaw));
    this.yaw += turn;
    const aligned = Math.abs(facing - this.yaw) < 0.3;
    const move = aligned && !seated ? Math.sign(away) * Math.min(Math.abs(away), WALK_SPEED * dt) : 0;
    this.x += move;
    this.atStation = Math.abs(station - this.x) < 0.02 && Math.abs(stand - this.yaw) < 0.05;
    this.stride += (Math.abs(move) + Math.abs(turn) * 0.12) * STRIDE;
    const stepping = at.lean > 0.02 && at.lean < 0.98; // stepping up to the cup, and back
    if (stepping && !wish.still) this.stride += dt * 9;
    // his gait fades in and out over a few frames, so that his legs settle when he stops and do not snap to standing
    const gait = dt > 0 ? Math.max(Math.min(1, (Math.abs(move) + Math.abs(turn) * 0.12) / (WALK_SPEED * dt) * 1.2), stepping ? 0.6 : 0) : this.walking;
    this.walking += (gait - this.walking) * Math.min(1, dt * 14);

    // his front legs shake the sifter while powder falls
    this.sifting += ((at.grains > 0 && this.atStation ? 1 : 0) - this.sifting) * Math.min(1, dt * 6);
    // the book opens once he has sat down, and closes before he gets up
    const reading = wish.resting && this.rest === 1 && Math.abs(AT.cushion - this.x) < 0.02 && Math.abs(this.yaw) < 0.05 ? 1 : 0;
    const opening = Math.abs(reading - this.reading) > 0.05; // his front legs are on their way up to the book, or down from it
    this.reading += (reading - this.reading) * Math.min(1, dt * 5);

    // His front legs go up and come down with what he has off the table. Whether they are on their way is read off
    // what they did in this frame, so that putting his work down for a break and picking it up again count as well.
    const holding = this.atStation ? carrying(at) : 0;
    if (wish.still) this.lifting = wish.still.lifting && this.atStation ? 1 : 0;
    else if (dt > 0) this.lifting = Math.abs(holding - this.held) / dt > LIFT_RATE ? 1 : 0;
    this.held = holding;

    return { at, motion: {
      t: wish.t, stride: this.stride, walking: this.walking, lean: at.lean, calm: at.touching ? 1 : 0, reading: this.reading,
      whisking: at.whisking, wiping: at.wipe, sifting: this.sifting, holding, lifting: this.lifting || opening ? 1 : 0, proboscis: at.touching ? wish.proboscis : 0,
    } };
  }
}
