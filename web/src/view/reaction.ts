// The reaction card: what he was served, which neurons hear it, what the brain did, and one line in his voice.
// Pure: data in, tagged markup out. The split between the lines is the honest answer to "what does he feel".
// The voice line is staged and may never say more than the outcome supports. With no recording it says nothing about taste.

import { levelHz, sipLevels, type Codec } from "../codec/codec";
import { provenancesIn, ref, Registry, type Provenance } from "../honesty/honesty";
import type { CloudInfo } from "./cloud";
import type { Recording } from "./light";
import type { Phase } from "./loop";
import type { Sip } from "./rotation";

/** Set while the ceremony's clock is held: he is reading `book`, or has shut it and is on his way back to his work. */
export interface Away { book: string; returning: boolean }

export interface CardLine { title: string; html: string; tags: Provenance[] }
export interface Card { heading: string; lines: CardLine[]; footnote: string }

export function quantities(): Registry {
  return new Registry()
    .define({ id: "sip.tea", label: "tea and tier", provenance: "staged", derivedFrom: [], explain: "Which tier a tea belongs to was guessed from tasting notes. It is not a measurement of the product." })
    .define({ id: "sip.amount", label: "scoops and sweets", provenance: "staged", derivedFrom: [], explain: "Chosen by a fixed rotation, the same in every run. Nobody is choosing yet." })
    .define({ id: "sip.level", label: "level", provenance: "staged", derivedFrom: ["sip.tea", "sip.amount"], explain: "A tier and a number of scoops resolve to one of five levels. It inherits the guess behind the tier." })
    .define({ id: "codec.hz", label: "rate behind a level", provenance: "model", derivedFrom: [], explain: "Our choice of how hard a level drives the taste neurons: 0, 25, 50, 100 or 200 spikes per second." })
    .define({ id: "neurons.count", label: "neurons in a group", provenance: "connectome", derivedFrom: [], explain: "Counted in the MaleCNS v1.0 annotations. Sweet and bitter types are assigned from the taste connectome preprint." })
    .define({ id: "neurons.unlabelled", label: "neurons whose transmitter the dataset calls unclear", provenance: "connectome", derivedFrom: [], explain: "All six neurons of type LB1b. They are not short of data: the dataset's classifier wavers, for each of them, between acetylcholine and serotonin, and calls the type unclear. In the base model an unclear neuron's outputs count for nothing. Taste neurons are cholinergic wherever it has been measured, and the classifier is known to mistake sensory neurons for serotonin ones, so an arm of the taste experiment treats them as acetylcholine." })
    .define({ id: "cloud.points", label: "neurons drawn", provenance: "connectome", derivedFrom: [], explain: "One point per neuron whose cell body has a position in the imaged volume." })
    .define({ id: "voice.line", label: "his words", provenance: "staged", derivedFrom: [], explain: "Puppetry. At work the line follows the step of the ceremony, on a break his book. Once a recording exists, the line about the tea follows its outcome and nothing else." })
    .define({ id: "linger.seconds", label: "how long he stays with the cup", provenance: "staged", derivedFrom: [], explain: "Staged for now: a fixed list of times that ignores the tea on purpose, so that nobody reads a liking into it. Once recordings exist, he stays for as long as his brain keeps the proboscis motor neuron firing." })
    .define({ id: "input.spikes", label: "spikes the tea forces in his taste neurons", provenance: "model", derivedFrom: [], explain: "Computed as you watch by the model's own rule: a driven neuron fires at a step when its random lane falls under the level's threshold. They are exactly the spikes a run of the whole brain would force for the same seed. Whatever else his taste neurons do, and everything behind them, needs his wiring. The total grows with the length of the trial, which is staged: compare bowls by the rate, not by the total." })
    .define({ id: "replay.slowdown", label: "how much slower than his time", provenance: "staged", derivedFrom: [], explain: "A choice of display: his milliseconds are stretched so that single spikes can be seen." })
    .define({ id: "model.time", label: "how long the trial has run, in his time", provenance: "staged", derivedFrom: ["linger.seconds", "replay.slowdown"], explain: "Counted in the model's steps of a tenth of a millisecond, but how many steps a bowl gets is staged: the seconds his lips are on the tea, divided by the slowdown. A longer stay is a longer trial and a larger total at the same rate. It is not him tiring, and not him liking anything." })
    .define({ id: "trial.seed", label: "seed", provenance: "model", derivedFrom: [], explain: "The seed of the random input: the bowl's index, counted from zero. The same seed gives the same spikes, here and in the lab." })
    .define({ id: "loop.sip", label: "which bowl this is", provenance: "staged", derivedFrom: [], explain: "The ceremony, its six steps and their order are staged. The model has no memory, so no sip knows about the one before." });
}

// Words about the work, never about the taste: nothing here may say more than a recording supports, and there is none.
const VOICE_WITHOUT_A_BRAIN: Record<Phase, string> = {
  select: "This one today.",
  sift: "No lumps.",
  brew: "Whisk, whisk, whisk.",
  pour: "Careful now.",
  taste: "(he says nothing)",
  clean: "Tidy bowl, tidy mind.",
};

// On a break he talks about his book. Still puppetry, still nothing about the taste of anything, and no line of the books is quoted.
const VOICE_ON_A_BREAK: Record<string, string> = {
  "Crime and Punishment": "So many pages about one bad decision. All I have to choose is a tea.",
  "The Idiot": "A kind man in a complicated room. One more chapter.",
  Demons: "Everyone in this book needs to sit down with a bowl of tea.",
  "The Brothers Karamazov": "Three brothers, one father, not one tea ceremony. It shows.",
  "Notes from Underground": "He is spiteful, he says so himself. Has anybody offered him matcha?",
  "White Nights": "Four nights and a morning. A short book for a short break.",
};

const PHASE_WORDS: Record<Phase, string> = { select: "Selecting", sift: "Sifting", brew: "Brewing", pour: "Pouring", taste: "Tasting", clean: "Cleaning up" };

/** What the tea has forced in his taste neurons so far in this bowl. Set from his first touch of the tea to the end of tasting. */
export interface LiveInput { seed: number; steps: number; sweetSpikes: number; bitterSpikes: number; slowdown: number; touching: boolean }

/** One moment of the ceremony, as the card needs it. */
export interface Moment {
  sip: Sip;
  phase: Phase;
  phaseSeconds: number;
  recording: Recording | null;
  away: Away | null;
  live: LiveInput | null;
}

/** A line of the card. Its tags are the provenances of what it holds, plus any that its plain words need. */
function line(title: string, html: string, prose: Provenance[] = []): CardLine {
  const held = provenancesIn(html);
  return { title, html, tags: [...held, ...prose.filter((p) => !held.includes(p))] };
}

export function reactionCard(reg: Registry, codec: Codec, info: CloudInfo, moment: Moment): Card {
  const { sip, phase, recording, away, live } = moment;
  const levels = sipLevels(codec, sip.teaId ?? codec.menu.teas[0].id, sip.teaId ? sip.scoops : 0, sip.sweets);
  const tea = sip.teaId ? codec.menu.teas.find((t) => t.id === sip.teaId)! : null;
  const count = (group: string, only?: (m: CloudInfo["mouthparts"][number]) => boolean): number =>
    info.mouthparts.filter((m) => m.group === group && (!only || only(m))).length;

  const served = tea
    ? `${reg.q("sip.tea", `${tea.maker} ${tea.blend} (${tea.tier})`)} · ${reg.q("sip.amount", `${sip.scoops} scoop${sip.scoops === 1 ? "" : "s"}, ${sip.sweets} sweet${sip.sweets === 1 ? "" : "s"}`)}`
      + ` → bitter ${reg.q("sip.level", levels.bitter)}, sweet ${reg.q("sip.level", levels.sweet)}`
    : `${reg.q("sip.amount", `hot water, ${sip.sweets} sweet${sip.sweets === 1 ? "" : "s"}`)} → bitter ${reg.q("sip.level", 0)}, sweet ${reg.q("sip.level", levels.sweet)}`;

  // the tense matters: a rate in the present tense while nothing touches his lips would be a claim
  const when = live?.touching ? "Driven now:" : live || phase === "clean" ? "Were driven while the tea was on his lips:" : "Will be driven once the tea is on his lips:";
  const heard = `${when} ${reg.q("neurons.count", count("grn.sweet"))} sweet taste neurons at ${reg.q("codec.hz", `${levelHz(codec, "sweet", levels.sweet)} Hz`)}`
    + ` · ${reg.q("neurons.count", count("grn.bitter"))} bitter at ${reg.q("codec.hz", `${levelHz(codec, "bitter", levels.bitter)} Hz`)},`
    + ` ${reg.q("neurons.unlabelled", count("grn.bitter", (m) => !m.speaks))} of them, the whole type LB1b, with a transmitter the dataset calls unclear, so mute in the base model`;

  return {
    heading: away ? (away.returning ? "Back to the tea" : `On a break · reading ${away.book}`) : `${PHASE_WORDS[phase]} · ${tea ? `${tea.maker} ${tea.blend}` : "hot water"}`,
    lines: [
      line("Served", served),
      line("Heard by", heard),
      line("Did", did(reg, moment), ["model"]), // even with no number in it, this line speaks about the model
      line("In his words", reg.q("voice.line", voice(moment, tea !== null))),
    ],
    footnote: recording
      ? "The words are puppetry. The decision is not."
      : "The words are puppetry. The spikes on his lips are the model's. No decision has been computed yet.",
  };
}

function voice({ phase, away }: Moment, tea: boolean): string {
  if (away) return away.returning ? "Now, where was I?" : VOICE_ON_A_BREAK[away.book] ?? "One more chapter.";
  if (!tea && phase === "select") return "Only hot water today.";
  if (!tea && phase === "sift") return "Nothing to sift.";
  return VOICE_WITHOUT_A_BRAIN[phase];
}

// Slice V2 replaces the part about the dark brain with what a recording holds. Until then nothing behind his lips is claimed.
function did(reg: Registry, { phase, phaseSeconds, recording, live, away }: Moment): string {
  if (recording) return "A recording is loaded, but this build does not know how to read it yet.";
  // the question a viewer has while he reads: does he need this break? He does not, and the page should not let them think so
  const rested = "The break is yours, not his. He is not tired: the model has no fatigue, no hunger and no memory, so every bowl starts from rest. A real fly would adapt, fill up and sleep.";
  if (away && !live) return rested;
  const dark = `Behind them his brain is dark: its wiring is not loaded yet (${ref("slice 03")}), so nothing answers, and we make no answer up.`;
  if (phase !== "taste") return phase === "clean" ? `Tasting is over. ${dark.replace("Behind them his", "His")}` : "Nothing to taste yet.";
  const stay = `He stays ${reg.q("linger.seconds", `${phaseSeconds} s`)}, a time that ignores the tea until his brain can set it.`;
  if (!live) return `His lips are not on the tea yet. ${stay}`;
  const ms = (live.steps / 10).toFixed(1);
  return `${live.touching ? "The tea is on his lips. It has forced" : "The tea forced"} ${reg.q("input.spikes", live.sweetSpikes, "live")} spikes in his sweet taste neurons`
    + ` and ${reg.q("input.spikes", live.bitterSpikes, "live")} in the bitter ones, in ${reg.q("model.time", `${ms} ms`)} of his time, a length set by his staged stay and not by the tea,`
    + ` shown ${reg.q("replay.slowdown", `${live.slowdown} times`)} slower, seed ${reg.q("trial.seed", live.seed)}. ${dark} ${away ? rested : stay}`;
}
