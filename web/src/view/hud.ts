// The words around the stage, as markup. Pure: data in, tagged markup out, so the audit can read what the page will say
// before the page says it. Every number goes through Registry.q(); every pointer to a paper or a version through ref().

import { PROVENANCE_WORDS, ref, type Provenance, type Registry } from "../honesty/honesty";
import type { CloudInfo } from "./cloud";
import type { LipDot } from "./lips";
import { PHASES, type LoopState } from "./loop";
import { GROUP_COLOUR, GROUP_WORDS } from "./palette";
import type { Card } from "./reaction";

const count = (n: number): string => n.toLocaleString("en-US");
const tag = (p: Provenance): string => `<span class="tag tag-${p}">${PROVENANCE_WORDS[p]}</span>`;

export function titleHtml(reg: Registry, info: CloudInfo): string {
  return `<h1>Fly brews matcha</h1>`
    + `<p>${reg.q("cloud.points", count(info.points))} of his ${reg.q("neurons.count", count(info.typedNeurons))} typed neurons have a cell body position, `
    + `and each one is a point in the cloud. None is lit. Light is kept for spikes, and no recording exists yet.</p>`;
}

export function trackHtml(reg: Registry, state: LoopState): string {
  const at = PHASES.indexOf(state.phase);
  const steps = PHASES.map((phase, i) => `<li class="${i < at ? "done" : i === at ? "now" : "next"}">${phase}</li>`).join("");
  return `<span class="sip">sip ${reg.q("loop.sip", count(state.sipIndex + 1))}</span><ol>${steps}</ol>${tag("staged")}`;
}

export function cardHtml(card: Card): string {
  const lines = card.lines.map((line) => `<div class="line"><dt>${line.title} ${line.tags.map(tag).join(" ")}</dt><dd>${line.html}</dd></div>`).join("");
  return `<h2>${card.heading}</h2><dl>${lines}</dl><p class="footnote">${card.footnote}</p>`;
}

export function lipsHtml(reg: Registry, dots: LipDot[]): string {
  const circles = dots.map((dot) => {
    const colour = GROUP_COLOUR[dot.group];
    const paint = dot.speaks ? `fill="${colour}"` : `fill="none" stroke="${colour}" stroke-width="1.4"`;
    return `<circle data-body="${dot.bodyId}" cx="${(120 + dot.u * 100).toFixed(1)}" cy="${(78 - dot.v * 100).toFixed(1)}" r="5.4" ${paint}/>`;
  }).join("");
  const of = (group: string, mute = false): number => dots.filter((d) => d.group === group && (!mute || !d.speaks)).length;
  return `<svg viewBox="0 0 240 150" role="img" aria-label="one dot per taste neuron, on the left and the right lobe of his lips">${circles}</svg>`
    + `<div><h3>His lips, magnified ${tag("connectome")} ${tag("staged")}</h3>`
    + `<p><span class="swatch" style="background:${GROUP_COLOUR["grn.sweet"]}"></span>${reg.q("neurons.count", of("grn.sweet"))} sweet taste neurons `
    + `<span class="swatch" style="background:${GROUP_COLOUR["grn.bitter"]}"></span>${reg.q("neurons.count", of("grn.bitter"))} bitter, `
    + `${reg.q("neurons.unlabelled", of("grn.bitter", true))} of them rings: no transmitter label.</p>`
    + `<p class="small">They have no cell body inside the imaged volume, so they are not in the cloud. Left and right are from the fly. Where a dot sits within its lobe is ours.</p></div>`;
}

export function legendHtml(reg: Registry, info: CloudInfo): string {
  const rows = info.groups.filter((g) => g.id !== "none").map((g) =>
    `<li><span class="swatch" style="background:${GROUP_COLOUR[g.id]}"></span>${reg.q("neurons.count", count(g.points))} ${GROUP_WORDS[g.id] ?? g.id}</li>`).join("");
  return `<h3>In the cloud ${tag("connectome")}</h3><ul>${rows}</ul>`
    + `<p class="small">Colour says which group a neuron belongs to, from the census. It is not activity.</p>`;
}

export function stagedHtml(reg: Registry, ids: string[]): string {
  const rows = ids.map((id) => {
    const def = reg.get(id);
    return `<li>${tag(def.provenance)} <b>${def.label}</b><br>${reg.q(id, def.explain)}</li>`;
  }).join("");
  return `<h3>What is staged here?</h3>`
    + `<p>Everything that moves. The table, the tins, the whisk, the order of the ceremony and his words are puppetry, and glow amber while this is open. `
    + `The points of the cloud, their places and their groups are from the fly.</p><ul>${rows}</ul>`;
}

export function footHtml(): string {
  return `Connectome: ${ref("MaleCNS v1.0")}, Janelia FlyEM, Cambridge and Google, ${ref("CC-BY 4.0")}. Neuron model after ${ref("Shiu et al. 2024")}. Drag to look around.`;
}
