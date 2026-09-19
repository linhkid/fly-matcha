// The words around the stage, as markup. Pure: data in, tagged markup out, so the audit can read what the page will say
// before the page says it. Every number goes through Registry.q(); every pointer to a paper or a version through ref().
// The panels themselves are <details> elements in index.html, so each one folds away; these functions fill them.

import { PROVENANCE_WORDS, ref, type Provenance, type Registry } from "../honesty/honesty";
import type { CloudInfo } from "./cloud";
import type { LipDot } from "./lips";
import { PHASES, type LoopState } from "./loop";
import { GROUP_COLOUR, GROUP_WORDS } from "./palette";
import type { Card, CardLine } from "./reaction";

const count = (n: number): string => n.toLocaleString("en-US");
const tag = (p: Provenance): string => `<span class="tag tag-${p}">${PROVENANCE_WORDS[p]}</span>`;

export function titleHtml(reg: Registry, info: CloudInfo): string {
  return `<p>Beside him floats his own nervous system: ${reg.q("cloud.points", count(info.points))} of his ${reg.q("neurons.count", count(info.typedNeurons))} typed neurons `
    + `have a cell body position, and each one is a point. When the tea touches his lips, light runs through it: every flash is a spike from a recording of his whole brain tasting that bowl, `
    + `${reg.q("neurons.count", count(info.typedNeurons))} neurons on their real wiring. Between bowls it is dark, because this model has no activity of its own.</p>`
    + `<p>He never tires, and that is a limit of the model, not a trait of his. It has no fatigue, no hunger and no memory: every bowl starts from rest, and the same seed gives the same spikes. A real fly would adapt, fill up and fall asleep.</p>`;
}

export function trackHtml(reg: Registry, state: LoopState): string {
  const at = PHASES.indexOf(state.phase);
  const steps = PHASES.map((phase, i) => `<li class="${i < at ? "done" : i === at ? "now" : "next"}">${phase}</li>`).join("");
  return `<span class="bowl">bowl ${reg.q("loop.sip", count(state.sipIndex + 1))}</span><ol class="${state.paused ? "held" : ""}">${steps}</ol>`;
}

const lineHtml = (line: CardLine, attributes = ""): string => `<div class="line"><dt>${line.title} ${line.tags.map(tag).join(" ")}</dt><dd${attributes}>${line.html}</dd></div>`;

export const cardHeadHtml = (card: Card): string => `<h2>${card.heading}</h2>`;

/** What his brain did and what he says come first. What he was served, and who hears it, fold away under them. */
export function cardBodyHtml(card: Card, moreOpen: boolean): string {
  const [served, heard, did, words] = card.lines;
  // the line that counts spikes is rewritten on its own, and is not read out each time it ticks
  return `<dl>${lineHtml(did, ' id="card-did" aria-live="off"')}${lineHtml(words)}</dl>`
    + `<details class="more"${moreOpen ? " open" : ""}><summary>What he was served, and which neurons hear it</summary><dl>${lineHtml(served)}${lineHtml(heard)}</dl></details>`
    + `<p class="footnote">${card.footnote}</p>`;
}

export function lipsHtml(reg: Registry, dots: LipDot[], slowdown: number): string {
  const circles = dots.map((dot) => {
    const colour = GROUP_COLOUR[dot.group];
    const paint = dot.speaks ? `fill="${colour}"` : `fill="none" stroke="${colour}" stroke-width="1.4"`;
    return `<circle data-body="${dot.bodyId}" cx="${(120 + dot.u * 100).toFixed(1)}" cy="${(78 - dot.v * 100).toFixed(1)}" r="5.4" ${paint}/>`;
  }).join("");
  const of = (group: string, mute = false): number => dots.filter((d) => d.group === group && (!mute || !d.speaks)).length;
  return `<svg viewBox="0 0 240 150" role="img" aria-label="one dot per taste neuron, on the left and the right lobe of his lips">${circles}</svg>`
    + `<div><p><span class="swatch" style="background:${GROUP_COLOUR["grn.sweet"]}"></span>${reg.q("neurons.count", of("grn.sweet"))} sweet taste neurons `
    + `<span class="swatch" style="background:${GROUP_COLOUR["grn.bitter"]}"></span>${reg.q("neurons.count", of("grn.bitter"))} bitter, `
    + `${reg.q("neurons.unlabelled", of("grn.bitter", true))} of them rings: the type LB1b, whose transmitter the dataset calls unclear.</p>`
    + `<details class="more"><summary>What the dots show</summary><p class="small">A dot flashes each time that neuron fires in the recording of his whole brain for this bowl, ${reg.q("replay.slowdown", `${slowdown} times`)} slower than his time. `
    + `They have no cell body inside the imaged volume, so they are not in the cloud. Left and right are from the fly. Where a dot sits within its lobe is ours.</p></details></div>`;
}

export function legendHtml(reg: Registry, info: CloudInfo): string {
  const rows = info.groups.filter((g) => g.id !== "none").map((g) =>
    `<li><span class="swatch" style="background:${GROUP_COLOUR[g.id]}"></span>${reg.q("cloud.points", count(g.points))} ${GROUP_WORDS[g.id] ?? g.id}</li>`).join("");
  return `<ul>${rows}</ul><p class="small">Colour is paint: it says which group a neuron belongs to, from the census. Light is spikes: a point flashes when that neuron fires in the recording. `
    + `Each count is the points drawn: a member of a group with no cell body position is in the census but not in the cloud.</p>`;
}

export function stagedHtml(reg: Registry, ids: string[]): string {
  const rows = ids.map((id) => {
    const def = reg.get(id);
    return `<li>${tag(def.provenance)} <b>${def.label}</b><br>${reg.q(id, def.explain)}</li>`;
  }).join("");
  return `<h3>What is staged here?</h3>`
    + `<p>Brewing tea is: no fly brain does that, so the table, the tins, the whisk, the order of the ceremony, his walk and his words are puppetry, and are tinted lilac while this is open. `
    + `What is his: the points of the cloud, their places and groups, the wiring the recordings ran on, and the count and sides of his taste neurons. What is the model's: every spike, on his lips and in the cloud.</p><ul>${rows}</ul>`;
}

export function footHtml(): string {
  return `Connectome: ${ref("MaleCNS v1.0")}, Janelia FlyEM, Cambridge and Google, ${ref("CC-BY 4.0")}. Neuron model after ${ref("Shiu et al. 2024")}. Drag to look around, scroll to come closer.`;
}
