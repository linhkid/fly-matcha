// The words around the stage: every number tagged, in every phase of every sip, and the taste neurons where the dataset puts them.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Codec } from "../src/codec/codec";
import { audit, ref } from "../src/honesty/honesty";
import type { CloudInfo } from "../src/view/cloud";
import { cardHtml, footHtml, legendHtml, lipsHtml, stagedHtml, titleHtml, trackHtml } from "../src/view/hud";
import { lipLayout } from "../src/view/lips";
import { PHASES } from "../src/view/loop";
import { quantities, reactionCard } from "../src/view/reaction";
import { sipAt } from "../src/view/rotation";

const root = new URL("../../", import.meta.url);
const codec: Codec = JSON.parse(readFileSync(new URL("contracts/codec/taste.codec.json", root), "utf8"));
const info: CloudInfo = JSON.parse(readFileSync(new URL("data/built/web/brain.cloud.json", root), "utf8"));
const reg = quantities();

describe("the audit", () => {
  it("finds a number that stands in the text with no tag, and lets a reference be", () => {
    expect(audit("<p>He has 34 sweet neurons.</p>", reg)).toEqual(["34: a number with no tag"]);
    expect(audit(`<p>He has ${reg.q("neurons.count", 34)} sweet neurons, after ${ref("Shiu et al. 2024")}.</p>`, reg)).toEqual([]);
    expect(audit('<circle cx="12.5" r="4"/>', reg)).toEqual([]); // geometry is not a claim
    expect(audit("<p>MN9 and LB1a are names. 1,204 is not.</p>", reg)).toEqual(["1,204: a number with no tag"]);
  });
});

describe("the words around the stage", () => {
  it("carry a tag on every number, in every phase of a whole cycle of sips", () => {
    const dots = lipLayout(info.mouthparts);
    const fixed = titleHtml(reg, info) + lipsHtml(reg, dots) + legendHtml(reg, info) + stagedHtml(reg, reg.ids()) + footHtml();
    expect(audit(fixed, reg)).toEqual([]);
    for (let sipIndex = 0; sipIndex < 25; sipIndex++) {
      for (const phase of PHASES) {
        const html = trackHtml(reg, { sipIndex, phase, progress: 0.5, paused: false })
          + cardHtml(reactionCard(reg, codec, info, sipAt(codec, sipIndex), phase, null));
        expect(audit(html, reg), `sip ${sipIndex}, ${phase}`).toEqual([]);
      }
    }
  });

  it("names every coloured group of the cloud with the count the cloud file gives", () => {
    const text = legendHtml(reg, info).replace(/<[^>]*>/g, " ");
    for (const group of info.groups.filter((g) => g.id !== "none")) expect(text).toContain(group.points.toLocaleString("en-US"));
    expect(text).toMatch(/2\s+MN9/);
    expect(text).toMatch(/not activity/);
  });

  it("marks the step he is on and counts sips from one", () => {
    const html = trackHtml(reg, { sipIndex: 4, phase: "pour", progress: 0, paused: false });
    expect(html).toContain('<li class="now">pour</li>');
    expect(html).toContain('<li class="done">brew</li>');
    expect(html).toContain('<li class="next">taste</li>');
    expect(html.replace(/<[^>]*>/g, "")).toContain("sip 5");
  });
});

describe("the taste neurons on his lips", () => {
  const dots = lipLayout(info.mouthparts);

  it("draws one dot per neuron, each on its own spot, left ones on his left and right ones on his right", () => {
    expect(dots.length).toBe(info.mouthparts.length);
    expect(new Set(dots.map((d) => d.bodyId)).size).toBe(dots.length);
    expect(new Set(dots.map((d) => `${d.u.toFixed(3)}/${d.v.toFixed(3)}`)).size).toBe(dots.length);
    for (const dot of dots) {
      expect(Math.abs(dot.u)).toBeLessThanOrEqual(1);
      expect(Math.abs(dot.v)).toBeLessThanOrEqual(1);
      if (dot.side === "L") expect(dot.u).toBeLessThan(0);
      if (dot.side === "R") expect(dot.u).toBeGreaterThan(0);
    }
  });

  it("keeps sweet above bitter in each lobe, and draws the unlabelled ones as rings", () => {
    for (const side of ["L", "R"]) {
      const sweet = dots.filter((d) => d.side === side && d.group === "grn.sweet").map((d) => d.v);
      const bitter = dots.filter((d) => d.side === side && d.group === "grn.bitter").map((d) => d.v);
      expect(Math.min(...sweet)).toBeGreaterThan(Math.max(...bitter));
    }
    const html = lipsHtml(reg, dots);
    expect(html.match(/<circle /g)?.length).toBe(72);
    expect(html.match(/fill="none"/g)?.length).toBe(info.mouthparts.filter((m) => !m.speaks).length);
  });
});
