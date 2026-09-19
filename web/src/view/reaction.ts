// The reaction card: what he was served, which neurons hear it, what the brain did, and one line in his voice.
// Pure: data in, tagged markup out. The split between the lines is the honest answer to "what does he feel".
// The voice line is staged and may never say more than the outcome supports. With no recording it says nothing about taste.

import { levelHz, sipLevels, type Codec } from "../codec/codec";
import { ref, Registry, type Provenance } from "../honesty/honesty";
import type { CloudInfo } from "./cloud";
import type { Recording } from "./light";
import type { Phase } from "./loop";
import type { Sip } from "./rotation";

export interface CardLine { title: string; html: string; tags: Provenance[] }
export interface Card { heading: string; lines: CardLine[]; footnote: string }

export function quantities(): Registry {
  return new Registry()
    .define({ id: "sip.tea", label: "tea and tier", provenance: "staged", derivedFrom: [], explain: "Which tier a tea belongs to was guessed from tasting notes. It is not a measurement of the product." })
    .define({ id: "sip.amount", label: "scoops and sweets", provenance: "staged", derivedFrom: [], explain: "Chosen by a fixed rotation, or by you when paused." })
    .define({ id: "sip.level", label: "level", provenance: "staged", derivedFrom: ["sip.tea", "sip.amount"], explain: "A tier and a number of scoops resolve to one of five levels. It inherits the guess behind the tier." })
    .define({ id: "codec.hz", label: "rate behind a level", provenance: "model", derivedFrom: [], explain: "Our choice of how hard a level drives the taste neurons: 0, 25, 50, 100 or 200 spikes per second." })
    .define({ id: "neurons.count", label: "neurons in a group", provenance: "connectome", derivedFrom: [], explain: "Counted in the MaleCNS v1.0 annotations. Sweet and bitter types are assigned from the taste connectome preprint." })
    .define({ id: "neurons.unlabelled", label: "neurons with no transmitter label", provenance: "connectome", derivedFrom: [], explain: "The dataset gives these neurons no usable transmitter. In the base model their outputs then count for nothing." })
    .define({ id: "cloud.points", label: "neurons drawn", provenance: "connectome", derivedFrom: [], explain: "One point per neuron whose cell body has a position in the imaged volume." })
    .define({ id: "voice.line", label: "his words", provenance: "staged", derivedFrom: [], explain: "Puppetry. Chosen by the outcome and by nothing else." })
    .define({ id: "loop.sip", label: "which sip this is", provenance: "staged", derivedFrom: [], explain: "The ceremony, its six steps and their order are staged. The model has no memory, so no sip knows about the one before." });
}

// Words about the work, never about the taste: nothing here may say more than a recording supports, and there is none.
const VOICE_WITHOUT_A_BRAIN: Record<Phase, string> = {
  select: "This one today.",
  sift: "No lumps.",
  brew: "Whisk, whisk, whisk.",
  pour: "Careful now.",
  taste: "…",
  clean: "Tidy bowl, tidy mind.",
};

const PHASE_WORDS: Record<Phase, string> = { select: "Selecting", sift: "Sifting", brew: "Brewing", pour: "Pouring", taste: "Tasting", clean: "Cleaning up" };

export function reactionCard(reg: Registry, codec: Codec, info: CloudInfo, sip: Sip, phase: Phase, recording: Recording | null): Card {
  const levels = sipLevels(codec, sip.teaId ?? codec.menu.teas[0].id, sip.teaId ? sip.scoops : 0, sip.sweets);
  const tea = sip.teaId ? codec.menu.teas.find((t) => t.id === sip.teaId)! : null;
  const count = (group: string, only?: (m: CloudInfo["mouthparts"][number]) => boolean): number =>
    info.mouthparts.filter((m) => m.group === group && (!only || only(m))).length;

  const served = tea
    ? `${reg.q("sip.tea", `${tea.maker} ${tea.blend} (${tea.tier})`)} · ${reg.q("sip.amount", `${sip.scoops} scoop${sip.scoops === 1 ? "" : "s"}, ${sip.sweets} sweet${sip.sweets === 1 ? "" : "s"}`)}`
      + ` → bitter ${reg.q("sip.level", levels.bitter)}, sweet ${reg.q("sip.level", levels.sweet)}`
    : `${reg.q("sip.amount", `hot water, ${sip.sweets} sweet${sip.sweets === 1 ? "" : "s"}`)} → bitter ${reg.q("sip.level", 0)}, sweet ${reg.q("sip.level", levels.sweet)}`;

  const heard = `${reg.q("neurons.count", count("grn.sweet"))} sweet taste neurons at ${reg.q("codec.hz", `${levelHz(codec, "sweet", levels.sweet)} Hz`)}`
    + ` · ${reg.q("neurons.count", count("grn.bitter"))} bitter at ${reg.q("codec.hz", `${levelHz(codec, "bitter", levels.bitter)} Hz`)},`
    + ` ${reg.q("neurons.unlabelled", count("grn.bitter", (m) => !m.speaks))} of them with no transmitter label, so mute in the base model`;

  // Slice V2 replaces this branch with what the recording holds. Until a recording exists, nothing is claimed.
  const did = recording
    ? "A recording is loaded, but this build does not know how to read it yet."
    : phase === "taste"
      ? `No recording yet. His wiring is loaded by ${ref("slice 03")}, and we do not make reactions up.`
      : "Nothing to taste yet.";

  return {
    heading: `${PHASE_WORDS[phase]} · ${tea ? `${tea.maker} ${tea.blend}` : "hot water"}`,
    lines: [
      { title: "Served", html: served, tags: ["staged"] },
      { title: "Heard by", html: heard, tags: ["connectome", "model"] },
      { title: "Did", html: did, tags: ["model"] },
      { title: "In his words", html: reg.q("voice.line", !tea && phase === "select" ? "Only hot water today." : !tea && phase === "sift" ? "Nothing to sift." : VOICE_WITHOUT_A_BRAIN[phase]), tags: ["staged"] },
    ],
    footnote: "The words are puppetry. The decision is not.",
  };
}
