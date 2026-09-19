// The endless ceremony: select, sift, brew, pour, taste, clean, and again with the next sip.
// A state machine over elapsed time. It knows nothing about drawing, and everything it drives is staged.

export const PHASES = ["select", "sift", "brew", "pour", "taste", "clean"] as const;
export type Phase = (typeof PHASES)[number];

export const PHASE_SECONDS: Record<Phase, number> = { select: 3.5, sift: 3.5, brew: 4.5, pour: 3, taste: 5, clean: 3.5 };

export interface LoopState {
  sipIndex: number;   // how many sips have been completed
  phase: Phase;
  progress: number;   // 0..1 through the current phase
  paused: boolean;
}

export class Loop {
  private elapsed = 0;  // seconds into the current phase
  private phaseAt = 0;
  private sips = 0;
  private held = false;

  /** Advance by `dt` seconds of wall time. Does nothing while paused. */
  tick(dt: number): LoopState {
    if (!this.held && dt > 0) {
      this.elapsed += dt;
      while (this.elapsed >= PHASE_SECONDS[PHASES[this.phaseAt]]) {
        this.elapsed -= PHASE_SECONDS[PHASES[this.phaseAt]];
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
    const phase = PHASES[this.phaseAt];
    return { sipIndex: this.sips, phase, progress: this.elapsed / PHASE_SECONDS[phase], paused: this.held };
  }

  pause(): void { this.held = true; }
  resume(): void { this.held = false; }
  toggle(): boolean { this.held = !this.held; return this.held; }
}
