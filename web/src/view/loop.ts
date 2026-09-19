// The endless ceremony: select, sift, brew, pour, taste, clean, and again with the next sip.
// A state machine over elapsed time. It knows nothing about drawing, and everything it drives is staged.

export const PHASES = ["select", "sift", "brew", "pour", "taste", "clean"] as const;
export type Phase = (typeof PHASES)[number];

/** How long each step takes, unless the loop is told otherwise. Tasting is the unhurried one: the page sets it, bowl by bowl, from what his brain did. */
export const PHASE_SECONDS: Record<Phase, number> = { select: 3.5, sift: 3.5, brew: 4.5, pour: 3, taste: 10, clean: 3.5 };

export type Seconds = (sipIndex: number, phase: Phase) => number;
const byTheClock: Seconds = (_sip, phase) => PHASE_SECONDS[phase];

export interface LoopState {
  sipIndex: number;      // how many sips have been completed
  phase: Phase;
  progress: number;      // 0..1 through the current phase
  phaseSeconds: number;  // how long this phase lasts, this time
  paused: boolean;
}

export class Loop {
  private elapsed = 0;  // seconds into the current phase
  private phaseAt = 0;
  private sips = 0;
  private held = false;

  constructor(private readonly seconds: Seconds = byTheClock) {}

  private length(): number {
    const length = this.seconds(this.sips, PHASES[this.phaseAt]);
    if (!(length > 0)) throw new Error(`a phase must take time: ${PHASES[this.phaseAt]} of sip ${this.sips} was given ${length}`);
    return length;
  }

  /** Advance by `dt` seconds of wall time. Does nothing while paused. */
  tick(dt: number): LoopState {
    if (!this.held && dt > 0) {
      this.elapsed += dt;
      while (this.elapsed >= this.length()) {
        this.elapsed -= this.length();
        this.phaseAt += 1;
        if (this.phaseAt === PHASES.length) {
          this.phaseAt = 0;
          this.sips += 1;
        }
      }
    }
    return this.state();
  }

  state(): LoopState {
    const phaseSeconds = this.length();
    return { sipIndex: this.sips, phase: PHASES[this.phaseAt], progress: this.elapsed / phaseSeconds, phaseSeconds, paused: this.held };
  }

  /** Jump to one moment of the ceremony. Used to hold a frame still for a shot, from the page's address. */
  seek(sipIndex: number, phase: Phase, progress: number): void {
    if (!Number.isInteger(sipIndex) || sipIndex < 0 || !PHASES.includes(phase) || !(progress >= 0 && progress < 1)) {
      throw new Error(`no such moment: sip ${sipIndex}, ${phase}, ${progress}`);
    }
    this.sips = sipIndex;
    this.phaseAt = PHASES.indexOf(phase);
    this.elapsed = progress * this.length();
  }

  pause(): void { this.held = true; }
  resume(): void { this.held = false; }
  toggle(): boolean { this.held = !this.held; return this.held; }
}
