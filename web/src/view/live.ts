// The live layer: the spikes a bowl of tea forces in his taste neurons, as far as the ceremony's clock has let the trial run.
// Pure: no DOM, no three.js, no clock of its own. One trial per bowl. The seed is the bowl's index; step 0 is the moment
// the tea touches his lips. How far the trial has run is a function of the ceremony's clock alone, so a held clock holds
// the trial and a still repeats it. His lips are on the tea only while that clock runs inside the touch window: the page
// keeps the clock held while he is away on a break and until he is back at his work, so this is the one owner of "touching".

import { sipLevels, type Codec } from "../codec/codec";
import { InputLayer, type Spikes } from "../engine/input";
import { light } from "./light";
import type { LipDot } from "./lips";
import type { LoopState } from "./loop";
import { touchWindow } from "./puppet";
import type { LiveInput } from "./reaction";
import type { Sip } from "./rotation";

export interface LiveOptions { stepsPerSecond: number; lightWindowSteps: number; slowdown: number }

interface Trial { sipIndex: number; layer: InputLayer; spikes: Spikes; upTo: number; counts: Map<string, number> }

export class LiveLayer {
  private trial: Trial | null = null;
  private readonly dark: Float32Array;
  private readonly index: Map<string, number>;
  private readonly channelOf: Map<string, string>; // body ID -> the codec channel that drives it

  constructor(private readonly codec: Codec, private readonly dots: LipDot[], private readonly options: LiveOptions) {
    this.dark = new Float32Array(dots.length);
    this.index = new Map(dots.map((dot, i) => [dot.bodyId, i]));
    this.channelOf = new Map(dots.map((dot) => {
      const channel = codec.channels.find((c) => c.group === dot.group);
      if (!channel) throw new Error(`no codec channel drives ${dot.group}`);
      return [dot.bodyId, channel.id];
    }));
  }

  /** What the tea has forced so far at this moment of the ceremony, and the light it gives his lips now. */
  at(state: LoopState, sip: Sip): { live: LiveInput | null; glow: Float32Array } {
    if (state.phase !== "taste") return { live: null, glow: this.dark };
    const [from, to] = touchWindow(state.phaseSeconds);
    const t = state.progress * state.phaseSeconds;
    if (t < from) return { live: null, glow: this.dark };
    const steps = Math.floor((Math.min(t, to) - from) * this.options.stepsPerSecond);
    if (!this.trial || this.trial.sipIndex !== state.sipIndex || steps < this.trial.upTo) this.trial = this.begin(state.sipIndex, sip);
    const trial = this.trial;
    const before = trial.spikes.spikeBodyId.length;
    trial.layer.run(trial.upTo, steps, trial.spikes);
    trial.upTo = steps;
    for (let i = before; i < trial.spikes.spikeBodyId.length; i++) {
      const channel = this.channelOf.get(trial.spikes.spikeBodyId[i])!;
      trial.counts.set(channel, (trial.counts.get(channel) ?? 0) + 1);
    }
    const touching = t <= to && !state.paused;
    return {
      live: { seed: trial.sipIndex, steps, sweetSpikes: trial.counts.get("sweet") ?? 0, bitterSpikes: trial.counts.get("bitter") ?? 0, slowdown: this.options.slowdown, touching },
      glow: touching ? light(this.dots.length, this.index, trial.spikes, steps, this.options.lightWindowSteps) : this.dark,
    };
  }

  private begin(sipIndex: number, sip: Sip): Trial {
    const levels = sipLevels(this.codec, sip.teaId ?? this.codec.menu.teas[0].id, sip.teaId ? sip.scoops : 0, sip.sweets);
    const thr16: Record<string, number> = { sweet: levels.sweetThr16, bitter: levels.bitterThr16 };
    const neurons = this.dots.map((dot) => ({ bodyId: dot.bodyId, thr16: thr16[this.channelOf.get(dot.bodyId)!] }));
    return { sipIndex, layer: new InputLayer(sipIndex, neurons), spikes: { spikeStep: [], spikeBodyId: [] }, upTo: 0, counts: new Map() };
  }
}
