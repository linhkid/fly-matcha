// Honesty tags, carried as data (specs/matcha-fly/CONTRACTS.md, "Honesty").
// provenance: where a claim comes from. source: for anything derived from spikes, live or recorded.

export type Provenance = "connectome" | "model" | "staged";
export type SpikeSource = "live" | "recorded";

const RANK: Record<Provenance, number> = { connectome: 0, model: 1, staged: 2 };

export const PROVENANCE_WORDS: Record<Provenance, string> = {
  connectome: "from the fly",
  model: "our model",
  staged: "staged",
};

export interface QuantityDef {
  id: string;
  label: string;
  provenance: Provenance;
  derivedFrom: string[];
  explain: string;
}

/** A derived quantity may not claim better than the worst of its inputs. */
export function join(...inputs: Provenance[]): Provenance {
  return inputs.reduce<Provenance>((worst, p) => (RANK[p] > RANK[worst] ? p : worst), "connectome");
}

export class Registry {
  private readonly defs = new Map<string, QuantityDef>();

  define(def: QuantityDef): this {
    if (this.defs.has(def.id)) throw new Error(`quantity ${def.id} defined twice`);
    const inputs = def.derivedFrom.map((id) => this.get(id).provenance);
    if (inputs.length && RANK[def.provenance] < RANK[join(...inputs)]) {
      throw new Error(`quantity ${def.id} claims ${def.provenance}, better than what it is derived from`);
    }
    this.defs.set(def.id, def);
    return this;
  }

  ids(): string[] {
    return [...this.defs.keys()];
  }

  get(id: string): QuantityDef {
    const def = this.defs.get(id);
    if (!def) throw new Error(`unknown quantity ${id}`);
    return def;
  }

  /** The only way to put a number or a claim on screen. */
  q(id: string, value: string | number, source?: SpikeSource): string {
    const def = this.get(id);
    const src = source ? ` data-src="${source}"` : "";
    return `<span class="q q-${def.provenance}" data-q="${def.id}" data-prov="${def.provenance}"${src} title="${escapeHtml(def.explain)}">${escapeHtml(String(value))}</span>`;
  }
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** A number that is a pointer, not a claim about the fly: a year in a citation, a version, a slice of the plan. */
export function ref(text: string): string {
  return `<span data-ref>${escapeHtml(text)}</span>`;
}

/**
 * Every quantity in a piece of markup carries the provenance its definition gives it, and no number
 * stands in the text outside a quantity or a reference. Returns the problems found.
 */
export function audit(html: string, registry: Registry): string[] {
  const problems: string[] = [];
  for (const tag of html.match(/<[^>]*\bdata-q="[^"]*"[^>]*>/g) ?? []) {
    const id = /data-q="([^"]*)"/.exec(tag)![1];
    const prov = /data-prov="([^"]*)"/.exec(tag)?.[1];
    if (!prov) problems.push(`${id}: no provenance`);
    else if (prov !== registry.get(id).provenance) problems.push(`${id}: shown as ${prov}, defined as ${registry.get(id).provenance}`);
  }
  const text = html.replace(/<span[^>]*\bdata-(q|ref)\b[^>]*>[^<]*<\/span>/g, " ").replace(/<[^>]*>/g, " ");
  // a digit inside a name, like MN9, is not a number
  for (const bare of text.match(/(?<![A-Za-z\d])\d+(?:[.,]\d+)*/g) ?? []) problems.push(`${bare}: a number with no tag`);
  return problems;
}
