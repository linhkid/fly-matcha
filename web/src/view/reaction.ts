// The reaction card: what he was served, which neurons hear it, what the brain did, and one line in his voice.
// Pure: data in, tagged markup out. The split between the lines is the honest answer to "what does he feel".
// The voice line is staged and may never say more than the outcome supports. With no recording it says nothing about taste.

import { levelHz, sipLevels, type Codec } from "../codec/codec";
import { provenancesIn, ref, Registry, type Provenance } from "../honesty/honesty";
import type { CloudInfo } from "./cloud";
import type { Movement } from "./gait";
import type { Phase } from "./loop";
import type { LegPair, Moved } from "./movement";
import type { Decoder, Outcome, Replayed, Stay } from "./replay";
import type { Sip } from "./rotation";

/** Set while the ceremony's clock is held: he is reading `book`, or has shut it and is on his way back to his work. */
export interface Away { book: string; returning: boolean; visit: number }   // visit: how many breaks he has been sent on, this one included

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
    .define({ id: "rec.window", label: "spikes of MN9 in the decoder's window", provenance: "model", derivedFrom: [], explain: "MN9's spikes between 200 ms and one second of the recorded trial: the number the decoder reads." })
    .define({ id: "decoder.threshold", label: "the decoder's thresholds", provenance: "model", derivedFrom: [], explain: "Fixed by rule from the confirmation seeds of the taste law experiment, before its held-out seeds were looked at: at or above the upper one he reaches for the tea, at or below the lower one he refuses." })
    .define({ id: "drink.cup", label: "how much of the cup he has drunk", provenance: "staged", derivedFrom: ["rec.readout"], explain: "His proboscis is out while MN9 fires, and the cup drains while it is out. That MN9 fires is the model's. How fast a cup empties is ours." })
    .define({ id: "rec.undrawable", label: "spikes that cannot be drawn", provenance: "model", derivedFrom: ["cloud.points"], explain: "Spikes of neurons that have no cell body position and no place on his lips. They happened in the recording and cannot be shown." })
    .define({ id: "replay.slowdown", label: "how much slower than his time", provenance: "staged", derivedFrom: [], explain: "A choice of display: his milliseconds are stretched so that single spikes can be seen." })
    .define({ id: "linger.seconds", label: "how long he stays with the cup", provenance: "staged", derivedFrom: ["rec.readoutLast", "replay.slowdown"], explain: "His brain's part: the moment MN9 fires for the last time in the recording. Ours: that his lips stay on the tea until then and one breath longer, at this slowdown, never under eight seconds and never over twenty. A bowl that never reaches MN9 gets the shortest stay." })
    .define({ id: "model.time", label: "how far the recording has been replayed, in his time", provenance: "staged", derivedFrom: ["linger.seconds", "replay.slowdown"], explain: "Counted in the model's steps of a tenth of a millisecond. How far a replay gets is set by how long he stays, so a longer stay shows more of the same recording." })
    .define({ id: "trial.seed", label: "seed", provenance: "model", derivedFrom: [], explain: "The seed of the random input of the recorded trial. The same seed gives the same spikes, here and in the lab." })
    .define({ id: "legs.sensors", label: "knee sensor neurons of the moving legs", provenance: "connectome", derivedFrom: [], explain: "Counted in the MaleCNS v1.0 annotations: neurons of the femoral chordotonal organ, the stretch sensor of the knee, in the legs that are moving, of the types whose labelled members the dataset calls hook or claw. It labels only a few of them so, all in the hind legs; the rest are taken to be the same kind by their type name. Hook neurons fire while a knee moves, claw neurons report its angle. The dataset holds few of them for the front legs: that is how far the front leg nerve has been traced, not how a fly is built." })
    .define({ id: "legs.motorTotal", label: "leg motor neurons", provenance: "connectome", derivedFrom: [], explain: "Every motor neuron of his six legs in the legs census, counted in the MaleCNS v1.0 annotations. All of them have a place in the cloud." })
    .define({ id: "legs.hz", label: "rate of a moving knee's sensors", provenance: "model", derivedFrom: [], explain: "Our choice of how hard a moving knee drives its sensors: the same rate as three pieces of sugar. What these neurons do is known from calcium imaging; nobody has published their spike rates. A real fly turns its hook neurons down while it moves itself, and a wiring diagram cannot, so the hook drive here is not gated as a real fly's is. A still leg drives nothing here, although a real claw neuron keeps reporting the angle it is held at." })
    .define({ id: "move.sensors", label: "spikes of his knee sensors", provenance: "model", derivedFrom: ["legs.hz"], explain: "The spikes the movement forces in the knee sensors of his moving legs, counted in the recording." })
    .define({ id: "move.neurons", label: "neurons that have answered his moving legs", provenance: "model", derivedFrom: ["cloud.points"], explain: "Neurons beyond the driven sensors that have fired at least once since this movement began, counted in the recording. Brain or nerve cord is read from where the cell body lies. Where the line between the two runs is ours." })
    .define({ id: "move.motor", label: "leg motor neurons that have fired", provenance: "model", derivedFrom: [], explain: "Nothing drives his motor neurons in the recorded trial. His knee sensors are driven, and a motor neuron fires only if his wiring carries the signal to it. Their firing moves nothing on this page: the puppet is moved by us." })
    .define({ id: "move.otherMotor", label: "motor neurons that are not of his legs, and fired too", provenance: "model", derivedFrom: [], explain: "His legs' motor neurons are not the only ones that answer. In the recording of a walk the busiest of the others drive the power muscles of his wings: the model has nothing in it that says he is standing on the ground. They are counted here so that the answer does not look tidier than it is. Only his leg motor neurons are drawn larger." })
    .define({ id: "move.pool", label: "the busiest pool of leg motor neurons", provenance: "model", derivedFrom: [], explain: "The pool with the most spikes so far. The name is the dataset's, for the muscle the pool drives. What pulling that muscle would do to his leg is not claimed here." })
    .define({ id: "move.time", label: "how far the movement's recording has been replayed, in his time", provenance: "staged", derivedFrom: ["replay.slowdown"], explain: "The recording starts when his legs start to move and runs while they do, stretched by the same slowdown as the tasting. How long a movement lasts is the puppet's." })
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

// His words about the tea follow the decoder's outcome and nothing else: not the tea's name, not its level, not how long he stayed.
// They exist only once the experiment that licenses a verdict has passed.
const VOICE_AFTER_TASTING: Record<Outcome, string[]> = {
  extend: ["Mm. Yes.", "I will have this one.", "Again, please."],
  refuse: ["No. Not this one.", "Thank you, no.", "I will leave this bowl."],
  neither: ["Hm.", "I cannot say.", "Hm. Let me think."],
};

// On a break he talks about his book. Still puppetry, still nothing about the taste of anything, and no line of the books is quoted:
// titles, and what everybody knows happens in them. Several lines for each book, so that a viewer who sends him off often does not hear
// the same one twice running. Which line is a matter of the bowl and of how many breaks he has been sent on, never of chance in here.
export const BREAK_LINES: Record<string, string[]> = {
  "Crime and Punishment": [
    "He had a theory and an axe. I have a whisk and no theories. My table is cleaner.",
    "The investigator simply waits. I respect that. Good water cannot be hurried either.",
    "A very small room and very large ideas. I am smaller still, and my ideas fit in a bowl.",
    "He confesses in the end. It would have saved a great deal of paper to do so in chapter one.",
    "Raskolnikov walks the city in a fever. I would put a cushion by the table and ask him nothing.",
    "A whole city to hide in, and he still cannot. I can hide behind a tea scoop.",
    "Sonya follows him all the way to Siberia. I would pack her a small whisk for the road.",
    "Two legs and he cannot walk away from it. I have six and I would not get far either.",
  ],
  "The Idiot": [
    "A kind man walks into society and society falls over. My table is lower. Less far to fall.",
    "The prince means well on every page. It does not help. Meaning well is not a method.",
    "Everyone shouts in drawing rooms. A tea room has one rule, and it is the opposite.",
    "It ends badly for everyone. I checked ahead. I am still going to read the middle.",
    "He trusts every face he meets. From my size that looks brave.",
    "Nastasya Filippovna never gets one calm afternoon. I would give her mine, and the good cushion.",
    "He is too good for the room. The room should have been tidied first.",
    "He would not hurt a fly. I notice that sort of thing. It is not common.",
  ],
  "Demons": [
    "A whole town undone by a committee. This is why I work alone.",
    "They have so many ideas and not one of them is about cleaning up afterwards.",
    "Everyone here has a plan for mankind. I have a plan for the next bowl. Mine is on schedule.",
    "They hold so many secret meetings. Not one of them thought to bring a kettle.",
    "A whole town buzzing and not one wing among them.",
    "Everyone follows someone who follows no one. I follow the lamp. At least it is honest.",
    "Ideas spread through this town like fruit flies through a kitchen. I say that with respect.",
    "Poor Shatov only wanted out. I would have kept a seat ready for him, well away from the meetings.",
  ],
  "The Brothers Karamazov": [
    "Three brothers, one dreadful father, and nobody sifts. It was always going to end in court.",
    "The father is a dreadful host. I say this professionally.",
    "One brother thinks, one feels, one prays. Between them they could not lay a tea table.",
    "Alyosha listens to everybody. Somebody should whisk a bowl just for him.",
    "They argue about heaven for whole chapters. I have been up to the ceiling. It is mostly paint.",
    "This book is heavier than everything I own, including the whisk, the bowl and me.",
    "A courtroom full of people staring at one man. I know the feeling. Usually someone holds a newspaper.",
    "Not one quiet meal in the whole family. I would seat them apart and pour slowly.",
  ],
  "Notes from Underground": [
    "He has been cross in a corner for a long time. I have a corner too. Mine has a cushion.",
    "A whole book of one man arguing with himself and losing. I admire the stamina, if not the score.",
    "He objects to reason. I measure powder with a scoop. We would not get on.",
    "He recalls every old slight in order. It is the only orderly thing about him.",
    "He is spiteful on purpose, he says. I tried it for one page. The whisk felt wrong.",
    "Such a long rant and nobody there to hear it. I am small, but I am listening.",
    "He argues with people who are not in the room. I am the size of a comma and I would still leave.",
    "He was cruel to Liza and he knows it. I would set a place for her first.",
  ],
  "White Nights": [
    "Four nights and she goes back to the other man. I saw it coming, and I am a fly.",
    "He dreams all day and meets one person. I brew all day and meet one bowl. We are both fine.",
    "A summer when the sky never goes dark. Useful for reading. Less so for the dreamer.",
    "A short sad book. I note that nobody in it was unkind, which is rare on this shelf.",
    "He wishes her well even as she leaves. That is tidy of him. Kinder than tidy.",
    "He walks the embankments alone at night. I would sit on the railing by him. I am quiet company.",
    "He gets four nights and no more. For a fly that is a fair share of a life.",
    "He talks for a whole night about himself. She is patient. I would have started whisking.",
  ],
  "Poor Folk": [
    "Two people write letters across a courtyard. I could fly it in a moment. Nobody asks me.",
    "He copies documents all day, neatly. At last, a man on this shelf I would trust with a whisk.",
    "He spends money he lacks on gifts she begs him not to buy. Kind, and badly organised.",
    "A novel made only of letters. Everyone is polite and everyone is poor. The politeness holds.",
    "He worries about his worn coat and his buttons. I have no coat. Wings go with everything.",
    "So much paper. One sheet of their letters would carpet my table twice.",
    "Varvara sews until her eyes ache. I would trim her lamp and clear a corner of the table for her.",
    "The letters stop when she marries and goes away. I would stay on with the old clerk a while.",
  ],
  "The Double": [
    "A second Golyadkin arrives and does everything better. I would simply give him the sifting.",
    "He keeps insisting he is his own man. The book keeps producing another one.",
    "A minor clerk loses his life to a copy of himself. Filing error, I assume.",
    "Nobody else seems troubled by the double. I would be. Then again, flies all look alike to people.",
    "I see many copies of everyone, all day. It is only my eyes. Someone should tell Mr Golyadkin.",
    "The double takes his desk, his friends, his place. Mine could have the cushion. Not the bowl.",
    "One clerk was already too many for that office. Two is a swarm.",
    "He runs about the city in the snow, so frightened. I would warm a bowl and leave it by the door.",
  ],
  "The Gambler": [
    "The grandmother arrives in a chair and loses a fortune. A fine entrance. A poor afternoon.",
    "A wheel goes round and everyone is ruined. My whisk goes round and there is tea.",
    "He is a tutor, though he teaches nothing in this book but how to lose.",
    "They keep betting on zero. I also have zero, and I have kept all of it.",
    "Alexei watches that wheel as if it could love him back. I would turn his chair toward the window, gently.",
    "The whole family waits for an inheritance. I will leave a whisk. Nobody is circling for it.",
    "He keeps saying he will stop. I would not scold. I would sit with him until the casino closed.",
    "A little ball hops around a wheel. It is about my size. I feel for it.",
  ],
  "The House of the Dead": [
    "A gentleman among convicts, watching carefully. It is what I do with humans, from lower down.",
    "Even there, men find small work for their hands. I am glad. Small work is all I have ever had.",
    "The cold in this book is considerable. I am a fly. I read this one near the kettle.",
    "A convict counts his days by the fence posts. I count nothing. The bowl is either clean or it is not.",
    "The convicts keep animals in the yard. No flies are mentioned. I looked, in a calm way.",
    "They put on a play at Christmas and are happy for an evening. I would have swept the stage for them.",
    "The barracks are crowded and loud. My table seats one fly. I see now how lucky that is.",
    "Every day the same walls and the same routine. Mine too, but I chose the bowl and the door is open.",
  ],
  "The Adolescent": [
    "His grand idea is to become rich. He is young. My grand idea is a level scoop.",
    "He wants to understand his father. His father explains nothing, pleasantly. Long book.",
    "The young man narrates in a great hurry. I would ask him to sit and sift something first.",
    "Secrets on every page. My table has one bowl and no surprises.",
    "His father is charming and never where he should be. I know the type. Moths.",
    "He is so easily hurt and hides it so badly. I would pretend not to notice and hand him a cloth.",
    "He wants a fortune and to be left alone with it. I have a bowl and am left alone with it. Done.",
    "Old Makar the pilgrim is kind to him. Every muddle needs one calm person, and a cushion for him.",
  ],
  "The Dream of a Ridiculous Man": [
    "He decides nothing matters, then falls asleep and changes his mind. Efficient, for this author.",
    "He finds an innocent world and spoils it single-handed. This is why I wipe my feet.",
    "He flies to another star in a dream. Long way. I think twice about crossing the room.",
    "He wakes up wanting to love everyone. Everyone is very large. I will start with the bowl.",
    "Everyone calls him ridiculous and he agrees. It saves a lot of argument.",
    "A ridiculous man, the title says. I am a fly with a whisk. We would get along.",
    "A small girl asks him for help and he cannot shake it off. Good. Small things should count.",
    "One small star catches his eye and changes everything. I understand. For me it is a lamp.",
  ],
};

/** His words on a break: a walk through the book's lines that visits every one before it repeats. */
export function breakLine(book: string, bowl: number, visit: number): string {
  const lines = BREAK_LINES[book];
  return lines ? lines[(bowl * 3 + visit * 5) % lines.length] : "One more chapter.";   // three and five share nothing with eight
}

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
  verdict: Verdict | null;     // what the licensed decoder makes of this bowl's recording. Null until an experiment licenses one.
  bowl: number;                // which bowl this is, so that his words vary without depending on anything about the tea
  frozen: boolean;             // the viewer has stopped the clock to read
  summary: Replayed | null;    // while he cleans up: what his brain did with the bowl he has just tasted, kept so it can be read
  legs: Legs;                  // what his legs are doing, and what his nervous system makes of it
}

/** His legs at one moment: still, moving with the recording on its way, or moving with his wiring's answer counted. */
export type Legs = { state: "still" } | { state: "waiting" | "failed"; id: Movement } | { state: "moving"; moved: Moved };

/** The decoded outcome of a bowl's recording, with the numbers it was decoded from. */
export interface Verdict { outcome: Outcome; windowCount: number; decoder: Decoder }

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
    heading: (moment.frozen ? "Paused · " : "") + (away ? (away.returning ? "Back to the tea" : `On a break · reading ${away.book}`) : `${PHASE_WORDS[phase]} · ${tea ? `${tea.maker} ${tea.blend}` : "hot water"}`),
    lines: [
      line("Served", served),
      line("Heard by", heard),
      line("Did", did(reg, moment), ["model"]), // even with no number in it, this line speaks about the model
      line("In his words", reg.q("voice.line", voice(moment, tea !== null))),
      line("His legs", legsLine(reg, moment.legs), ["model"]),
      line("The recordings", recordingsLine(reg, moment), ["model"]),
    ],
    footnote: moment.verdict
      ? `The words are puppetry and follow the verdict. So is every movement of his legs: his motor neurons firing moves nothing here. The verdict is not puppetry: it is decoded from MN9's recorded spikes by thresholds that experiment ${ref(moment.verdict.decoder.evidence.experiment)} fixed before its held-out seeds were looked at.`
      : "His words and his movements are puppetry: we move his legs. His motor neurons firing moves nothing here. The spikes are the model's, from recorded runs of his whole nervous system. No verdict has been licensed yet.",
  };
}

const PAIR_WORDS: Record<LegPair, string> = { fl: "front", ml: "middle", hl: "hind" };

// His legs are moved by us. What is his: the sensors that a moving knee drives, and everything his wiring does with their spikes.
function legsLine(reg: Registry, legs: Legs): string {
  if (legs.state === "still") return "His legs are still, so nothing drives their sensors, and nothing fires on their account.";
  const which = { walk: "All six legs are moving", front: "His front legs are at work" }[legs.state === "moving" ? legs.moved.id : legs.id];
  if (legs.state !== "moving") return `${which}. The recording of his nervous system for it ${legs.state === "failed" ? "could not be loaded" : "has not arrived yet"}, so nothing is shown.`;
  const m = legs.moved;
  const n = (value: number): string => value.toLocaleString("en-US");
  const busiest = m.busiest === null ? "" : ` The busiest pool so far, with ${reg.q("move.motor", n(m.busiest.spikes), "recorded")} of them, is `
    + (m.busiest.label === "no muscle named" ? `one of his ${PAIR_WORDS[m.busiest.leg]} legs that the dataset names no muscle for.` : `${reg.q("move.pool", m.busiest.label, "recorded")} of his ${PAIR_WORDS[m.busiest.leg]} legs.`);
  const others = m.otherMotorNeurons === 0 ? "" : ` They are not alone: ${reg.q("move.otherMotor", n(m.otherMotorNeurons), "recorded")} motor ${m.otherMotorNeurons === 1 ? "neuron of another part of him has" : "neurons of other parts of him have"} fired too.`;
  const unplaced = m.unplaced === 0 ? "" : `, ${reg.q("move.neurons", n(m.unplaced), "recorded")} with no cell body position`;
  return `${which}, so their knee sensors are driven: ${reg.q("legs.sensors", n(m.sensors))} neurons at ${reg.q("legs.hz", `${m.hz} Hz`)}.`
    + ` In ${reg.q("move.time", `${(m.steps / 10).toFixed(1)} ms`)} of his time ${reg.q("move.neurons", n(m.cord), "recorded")} neurons of his nerve cord${unplaced} and ${reg.q("move.neurons", n(m.brain), "recorded")} of his brain have answered.`
    + ` ${reg.q("move.motor", n(m.motorNeurons), "recorded")} of his ${reg.q("legs.motorTotal", n(m.motorTotal))} leg motor neurons have fired, ${reg.q("move.motor", n(m.motorSpikes), "recorded")} spikes in all.${busiest}${others}`
;
}

// What is folded away under the card: what cannot be drawn, how much slower it is shown, and that these are pilot recordings.
function recordingsLine(reg: Registry, { replayed, summary, phase, legs }: Moment): string {
  const tasted = replayed ?? (phase === "clean" ? summary : null);
  const moved = legs.state === "moving" ? legs.moved : null;
  if (!tasted && !moved) return legs.state === "still" ? "Nothing is being replayed: he tastes nothing and his legs are still." : "Nothing is being replayed: the recording for his moving legs is not here.";
  const n = (value: number): string => value.toLocaleString("en-US");
  const tasting = !tasted ? "" : `Tasting: ${reg.q("rec.undrawable", n(tasted.undrawable), "recorded")} of the spikes so far came from neurons with no position to draw.`
    + (tasted.pilot ? ` A pilot recording of his whole brain, seed ${reg.q("trial.seed", tasted.seed)}: the taste law has not been tested yet, so this is what was measured, not a verdict.` : "");
  const moving = !moved ? "" : ` His legs: his knee sensors have no cell body in the imaged volume, so their ${reg.q("move.sensors", n(moved.sensorSpikes), "recorded")} spikes so far are counted and cannot be drawn,`
    + ` and neither can ${reg.q("rec.undrawable", n(moved.undrawable), "recorded")} ${moved.undrawable === 1 ? "spike" : "spikes"} of other neurons without a position.`
    + (moved.pilot ? ` A pilot recording of his whole nervous system, seed ${reg.q("trial.seed", moved.seed)}: what was measured, not a claim about walking.` : "");
  return `${tasting}${moving} Shown ${reg.q("replay.slowdown", `${(tasted ?? moved!).slowdown} times`)} slower than his time.`.trim();
}

function voice({ phase, away, verdict, replayed, summary, bowl }: Moment, tea: boolean): string {
  if (away) return away.returning ? "Now, where was I?" : breakLine(away.book, bowl, away.visit);
  const tasted = (phase === "taste" && replayed !== null && !replayed.touching) || (phase === "clean" && summary !== null);
  if (verdict && tasted) return VOICE_AFTER_TASTING[verdict.outcome][bowl % 3];
  if (!tea && phase === "select") return "Only hot water today.";
  if (!tea && phase === "sift") return "Nothing to sift.";
  return VOICE_WITHOUT_A_BRAIN[phase];
}

// What his brain did, read from the recording and from nothing else. A count is a measurement. Slice 05 decides what it means.
function counted(reg: Registry, r: Replayed): string {
  return `his taste neurons fired ${reg.q("rec.taste", r.inputSpikes.toLocaleString("en-US"), "recorded")} times,`
    + ` ${reg.q("rec.neurons", r.otherNeurons.toLocaleString("en-US"), "recorded")} other neurons joined in across his brain and nerve cord,`
    + ` and MN9, the pair that lifts his proboscis, fired ${reg.q("rec.readout", r.readoutSpikes, "recorded")} times.`;
}

/** What the licensed decoder makes of the whole recorded second. Said once he has lifted his head, not while his lips are on the tea. */
function decoded(reg: Registry, verdict: Verdict): string {
  const { outcome, windowCount, decoder } = verdict;
  const count = reg.q("rec.window", windowCount, "recorded");
  const [low, high] = [reg.q("decoder.threshold", decoder.refuseAtMost), reg.q("decoder.threshold", decoder.extendAtLeast)];
  const reading = { extend: `at or above ${high}, so the decoder reads: he drinks.`, refuse: `at or below ${low}, so the decoder reads: he refuses.`, neither: `between ${low} and ${high}, so the decoder reads neither.` }[outcome];
  return ` Over the whole recorded second MN9 fired ${count} times after the first fifth of it: ${reading}`;
}

function did(reg: Registry, { phase, stay: length, replayed, away, waiting, summary, verdict }: Moment): string {
  // the question a viewer has while he reads: does he need this break? He does not, and the page should not let them think so
  const rested = "The break is yours, not his. He is not tired: the model has no fatigue, no hunger and no memory, so every bowl starts from rest. A real fly would adapt, fill up and sleep.";
  if (away && !replayed) return rested;
  if (phase === "clean") {
    const gone = "Nothing of it is left in him: the model keeps nothing from one bowl to the next.";
    return summary ? `With the bowl he has just tasted, in ${reg.q("model.time", `${(summary.steps / 10).toFixed(1)} ms`)} of his time, ${counted(reg, summary)}${verdict ? decoded(reg, verdict) : ""} ${gone}` : `Tasting is over. ${gone}`;
  }
  if (phase !== "taste") return "Nothing to taste yet.";
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
  const drinking = verdict ? ` His proboscis is out while MN9 fires, and he has drunk ${reg.q("drink.cup", `${Math.round(replayed.drunk * 100)}%`)} of the cup.${replayed.touching ? "" : decoded(reg, verdict)}` : "";
  const pilot = replayed.pilot ? " A pilot recording, not a verdict." : "";
  return `${replayed.touching ? "The tea is on his lips. In" : "The tea was on his lips. In"} ${reg.q("model.time", `${ms} ms`)} of his time ${counted(reg, replayed)}`
    + `${drinking}${pilot} ${away ? rested : stay}`;
}
