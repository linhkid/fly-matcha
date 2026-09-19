// The reaction card: what he was served, which neurons hear it, what the brain did, and one line in his voice.
// Pure: data in, tagged markup out. The split between the lines is the honest answer to "what does he feel".
// The voice line is staged and may never say more than the outcome supports. With no recording it says nothing about taste.

import { levelHz, sipLevels, type Codec } from "../codec/codec";
import { provenancesIn, Registry, type Provenance } from "../honesty/honesty";
import type { CloudInfo } from "./cloud";
import type { Phase } from "./loop";
import type { Replayed, Stay } from "./replay";
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
    .define({ id: "voice.line", label: "his words", provenance: "staged", derivedFrom: [], explain: "Puppetry. At work the line follows the step of the ceremony, on a break his book. He says nothing about the tea until the taste law has been tested and a verdict is licensed." })
    .define({ id: "rec.taste", label: "spikes of his taste neurons", provenance: "model", derivedFrom: [], explain: "From the recording of his whole brain for this bowl: the spikes the tea forces, and any more that his wiring adds." })
    .define({ id: "rec.neurons", label: "neurons beyond his taste neurons that have fired", provenance: "model", derivedFrom: [], explain: "Counted in the recording: every neuron of his brain and nerve cord that has fired at least once so far, his taste neurons apart." })
    .define({ id: "rec.readout", label: "spikes of MN9", provenance: "model", derivedFrom: [], explain: "MN9 is the pair of motor neurons that lifts the proboscis, one on each side. Counted in the recording. A count is what was measured. Whether it means he drinks is not decided until the taste law has been tested." })
    .define({ id: "rec.readoutLast", label: "when MN9 last fires in the recording", provenance: "model", derivedFrom: [], explain: "The moment of MN9's last spike, in his time, read from the recording. It is the one number his stay is made from." })
    .define({ id: "rec.undrawable", label: "spikes that cannot be drawn", provenance: "model", derivedFrom: ["cloud.points"], explain: "Spikes of neurons that have no cell body position and no place on his lips. They happened in the recording and cannot be shown." })
    .define({ id: "replay.slowdown", label: "how much slower than his time", provenance: "staged", derivedFrom: [], explain: "A choice of display: his milliseconds are stretched so that single spikes can be seen." })
    .define({ id: "linger.seconds", label: "how long he stays with the cup", provenance: "staged", derivedFrom: ["rec.readoutLast", "replay.slowdown"], explain: "His brain's part: the moment MN9 fires for the last time in the recording. Ours: that his lips stay on the tea until then and one breath longer, at this slowdown, never under eight seconds and never over twenty. A bowl that never reaches MN9 gets the shortest stay." })
    .define({ id: "model.time", label: "how far the recording has been replayed, in his time", provenance: "staged", derivedFrom: ["linger.seconds", "replay.slowdown"], explain: "Counted in the model's steps of a tenth of a millisecond. How far a replay gets is set by how long he stays, so a longer stay shows more of the same recording." })
    .define({ id: "trial.seed", label: "seed", provenance: "model", derivedFrom: [], explain: "The seed of the random input of the recorded trial. The same seed gives the same spikes, here and in the lab." })
    .define({ id: "loop.sip", label: "which bowl this is", provenance: "staged", derivedFrom: [], explain: "The ceremony, its six steps and their order are staged. The model has no memory, so no bowl knows about the one before." });
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

/** One moment of the ceremony, as the card needs it. */
export interface Moment {
  sip: Sip;
  phase: Phase;
  phaseSeconds: number;
  stay: Stay;                  // how long he stays with this bowl, and why: from the index, so it is known before the recording arrives
  away: Away | null;
  replayed: Replayed | null;   // set from his first touch of the tea to the end of tasting
  waiting: boolean;            // the recording of this bowl has not arrived yet
}

/** A line of the card. Its tags are the provenances of what it holds, plus any that its plain words need. */
function line(title: string, html: string, prose: Provenance[] = []): CardLine {
  const held = provenancesIn(html);
  return { title, html, tags: [...held, ...prose.filter((p) => !held.includes(p))] };
}

export function reactionCard(reg: Registry, codec: Codec, info: CloudInfo, moment: Moment): Card {
  const { sip, phase, away, replayed } = moment;
  const levels = sipLevels(codec, sip.teaId ?? codec.menu.teas[0].id, sip.teaId ? sip.scoops : 0, sip.sweets);
  const tea = sip.teaId ? codec.menu.teas.find((t) => t.id === sip.teaId)! : null;
  const count = (group: string, only?: (m: CloudInfo["mouthparts"][number]) => boolean): number =>
    info.mouthparts.filter((m) => m.group === group && (!only || only(m))).length;

  const served = tea
    ? `${reg.q("sip.tea", `${tea.maker} ${tea.blend} (${tea.tier})`)} · ${reg.q("sip.amount", `${sip.scoops} scoop${sip.scoops === 1 ? "" : "s"}, ${sip.sweets} sweet${sip.sweets === 1 ? "" : "s"}`)}`
      + ` → bitter ${reg.q("sip.level", levels.bitter)}, sweet ${reg.q("sip.level", levels.sweet)}`
    : `${reg.q("sip.amount", `hot water, ${sip.sweets} sweet${sip.sweets === 1 ? "" : "s"}`)} → bitter ${reg.q("sip.level", 0)}, sweet ${reg.q("sip.level", levels.sweet)}`;

  // the tense matters: a rate in the present tense while nothing touches his lips would be a claim
  const when = replayed?.touching ? "Now:" : replayed || phase === "clean" ? "While the tea was on his lips:" : "Once the tea is on his lips:";
  // a level of zero is no drive at all in the recorded trial, so the page does not call it a drive at zero
  const driven = (channel: string, level: number): string => (level === 0 ? "not driven" : `driven at ${reg.q("codec.hz", `${levelHz(codec, channel, level)} Hz`)}`);
  const heard = `${when} ${reg.q("neurons.count", count("grn.sweet"))} sweet taste neurons ${driven("sweet", levels.sweet)}`
    + ` · ${reg.q("neurons.count", count("grn.bitter"))} bitter ${driven("bitter", levels.bitter)},`
    + ` ${reg.q("neurons.unlabelled", count("grn.bitter", (m) => !m.speaks))} of them, the whole type LB1b, with a transmitter the dataset calls unclear, so mute in the base model`;

  return {
    heading: away ? (away.returning ? "Back to the tea" : `On a break · reading ${away.book}`) : `${PHASE_WORDS[phase]} · ${tea ? `${tea.maker} ${tea.blend}` : "hot water"}`,
    lines: [
      line("Served", served),
      line("Heard by", heard),
      line("Did", did(reg, moment), ["model"]), // even with no number in it, this line speaks about the model
      line("In his words", reg.q("voice.line", voice(moment, tea !== null))),
    ],
    footnote: "The words are puppetry. The spikes are the model's, recorded from a run of his whole brain. No verdict has been licensed yet.",
  };
}

function voice({ phase, away }: Moment, tea: boolean): string {
  if (away) return away.returning ? "Now, where was I?" : VOICE_ON_A_BREAK[away.book] ?? "One more chapter.";
  if (!tea && phase === "select") return "Only hot water today.";
  if (!tea && phase === "sift") return "Nothing to sift.";
  return VOICE_WITHOUT_A_BRAIN[phase];
}

// What his brain did, read from the recording and from nothing else. A count is a measurement. Slice 05 decides what it means.
function did(reg: Registry, { phase, stay: length, replayed, away, waiting }: Moment): string {
  // the question a viewer has while he reads: does he need this break? He does not, and the page should not let them think so
  const rested = "The break is yours, not his. He is not tired: the model has no fatigue, no hunger and no memory, so every bowl starts from rest. A real fly would adapt, fill up and sleep.";
  if (away && !replayed) return rested;
  if (phase !== "taste") return phase === "clean" ? "Tasting is over. What his brain did with it is gone: the model keeps nothing from one bowl to the next." : "Nothing to taste yet.";
  const seconds = reg.q("linger.seconds", `${Number(length.seconds.toFixed(1))} s`);
  const last = length.lastStep === null ? "" : reg.q("rec.readoutLast", `${(length.lastStep / 10).toFixed(1)} ms`, "recorded");
  const stay = {
    never: `He stays ${seconds}, the least he ever does: in this recording MN9 never fires.`,
    early: `He stays ${seconds}, the least he ever does: MN9 last fires at ${last} of his time, and he is never rushed.`,
    silent: `He stays ${seconds}: MN9 last fires at ${last} of his time, and his lips stay on the tea until then and a breath longer.`,
    longest: `He stays ${seconds}, the most he ever does: MN9 is still firing at ${last} of his time, later than the longest stay can show.`,
  }[length.why];
  if (waiting) return `The recording of this bowl has not arrived yet, so nothing is shown. ${stay}`;
  if (!replayed) return `His lips are not on the tea yet. ${stay}`;
  const ms = (replayed.steps / 10).toFixed(1);
  const pilot = replayed.pilot ? ` A pilot recording of his whole brain, seed ${reg.q("trial.seed", replayed.seed)}: the taste law has not been tested yet, so this is what was measured, not a verdict.` : "";
  return `${replayed.touching ? "The tea is on his lips. In" : "The tea was on his lips. In"} ${reg.q("model.time", `${ms} ms`)} of his time his taste neurons fired ${reg.q("rec.taste", replayed.tasteSpikes.toLocaleString("en-US"), "recorded")} times,`
    + ` ${reg.q("rec.neurons", replayed.otherNeurons.toLocaleString("en-US"), "recorded")} other neurons joined in across his brain and nerve cord,`
    + ` and MN9, the pair that lifts his proboscis, fired ${reg.q("rec.readout", replayed.readoutSpikes, "recorded")} times.`
    + ` ${reg.q("rec.undrawable", replayed.undrawable.toLocaleString("en-US"), "recorded")} of the spikes came from neurons with no position to draw. Shown ${reg.q("replay.slowdown", `${replayed.slowdown} times`)} slower.`
    + `${pilot} ${away ? rested : stay}`;
}
