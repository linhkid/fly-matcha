// How the puppet's legs are posed, and which of them are moving. Pure: no three.js, no clock of its own.
// Everything here is staged. It is kept apart from the drawing so that one question can be answered and tested:
// "which knees are moving right now?" The answer decides which of his knee sensors are driven (slice V3), so it must
// be true of the puppet: a pair of legs that is said to move has knees whose angle changes, and one that is not, has not.

export interface FlyMotion {
  t: number;         // seconds, for everything that idles
  stride: number;    // radians of gait, advanced by the distance he has walked
  walking: number;   // 0..1
  lean: number;      // 0..1, head down to the cup
  calm: number;      // 0..1, stillness while his lips are on the tea
  reading: number;   // 0..1, sitting up with his book
  whisking: number;  // 0..1, front legs at the whisk
  wiping: number;    // 0..1, front legs at the cloth
  sifting: number;   // 0..1, front legs shaking the sifter
  holding: number;   // 0..1, front legs up with what he has off the table: the tin, the kettle, the bowl, the cup
  lifting: number;   // 1 while that is on its way up or down, 0 while it is held still or stands on the table
  proboscis: number; // 0..1, how far out. From MN9's recorded spikes, never from the staging.
}

export const RAISE = 0.7, DROP = 1.22, FLAT = 0.26; // femur above the horizontal, tibia and tarsus below it, in radians: feet meet the ground

export interface LegPlan { pair: number; tripod: number; restYaw: number }   // pair 0 is the front legs, 1 the middle, 2 the hind
export interface LegAngles { yaw: number; raise: number; bend: number; flat: number }   // hip swing, hip lift, knee, ankle

// Through the part of a step in which the foot is down, the front leg's knee bends to pull the body towards the foot and
// the hind leg's straightens to push it away (Azevedo et al. 2024; slices/v3-he-moves.md). The middle leg's does little.
const KNEE_IN_STANCE = [0.08, 0.03, -0.08];

export function legAngles(m: FlyMotion, leg: LegPlan): LegAngles {
  const phase = m.stride + leg.tripod * Math.PI;
  const swing = Math.max(0, Math.sin(phase)) * m.walking;
  const pull = KNEE_IN_STANCE[leg.pair] * Math.cos(phase) * m.walking;
  let yaw = leg.restYaw + 0.34 * Math.cos(phase) * m.walking;
  let raise = RAISE + 0.3 * swing;
  let bend = -(RAISE + DROP) + 0.25 * swing + pull;
  let flat = DROP - FLAT - pull; // the foot stays flat on the table while the knee works
  if (leg.pair === 0) {
    // the front pair has work to do: at the sifter, the whisk, the cloth and the book
    const hold = Math.max(m.reading, m.whisking, m.wiping, m.sifting, m.holding);
    const work = m.whisking * Math.sin(m.t * 19) * 0.12 + m.wiping * Math.sin(m.t * 9) * 0.2 + m.sifting * Math.sin(m.t * 38) * 0.05;
    yaw += (-1.32 - yaw) * hold + work;
    raise += (1.05 - RAISE) * hold + 0.1 * m.lean;
    bend += (-(1.05 + 0.35) - bend) * hold + 0.6 * work; // a leg that reaches out and back does it with its knee
    flat += (0.5 - flat) * hold;
    yaw += 0.25 * m.lean; // at the cup his front feet stand either side of it
  }
  return { yaw, raise, bend, flat };
}

/** Which legs the puppet is moving: every one of them, the front pair alone, or none. */
export type Movement = "walk" | "front";
const BARELY = 0.05; // below this a movement cannot be seen, and is not claimed

export function movementOf(m: FlyMotion): Movement | null {
  if (m.walking > BARELY) return "walk";
  if (Math.max(m.whisking, m.wiping, m.sifting, m.lifting) > BARELY) return "front";
  return null;
}
