// The words around the stage: every number tagged, in every phase of every sip, and the taste neurons where the dataset puts them.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Codec } from "../src/codec/codec";
import { audit, ref } from "../src/honesty/honesty";
import type { CloudInfo } from "../src/view/cloud";
import { cardBodyHtml, cardHeadHtml, footHtml, legendHtml, lipsHtml, stagedHtml, titleHtml, trackHtml } from "../src/view/hud";
import type { Card } from "../src/view/reaction";
import { lipLayout } from "../src/view/lips";
import { PHASES } from "../src/view/loop";
import { bookAt } from "../src/view/puppet";
import { quantities, reactionCard } from "../src/view/reaction";
import { sipAt } from "../src/view/rotation";

const root = new URL("../../", import.meta.url);
const codec: Codec = JSON.parse(readFileSync(new URL("contracts/codec/taste.codec.json", root), "utf8"));
const info: CloudInfo = JSON.parse(readFileSync(new URL("data/built/web/brain.cloud.json", root), "utf8"));
const reg = quantities();
const cardHtml = (card: Card): string => cardHeadHtml(card) + cardBodyHtml(card, true);

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
    const fixed = titleHtml(reg, info) + lipsHtml(reg, dots, 50) + legendHtml(reg, info) + stagedHtml(reg, reg.ids()) + footHtml();
    expect(audit(fixed, reg)).toEqual([]);
    for (let sipIndex = 0; sipIndex < 25; sipIndex++) {
      for (const phase of PHASES) {
        const html = trackHtml(reg, { sipIndex, phase, progress: 0.5, phaseSeconds: 10, paused: false })
          + cardHtml(reactionCard(reg, codec, info, { sip: sipAt(codec, sipIndex), phase, phaseSeconds: 10, recording: null, away: null, live: null }));
        expect(audit(html, reg), `sip ${sipIndex}, ${phase}`).toEqual([]);
      }
    }
  });

  it("says what he reads on a break, keeps the sip on the card, and still says nothing about the taste of anything", () => {
    for (let sipIndex = 0; sipIndex < 25; sipIndex++) {
      for (const phase of PHASES) {
        const book = bookAt(sipIndex);
        const card = reactionCard(reg, codec, info, { sip: sipAt(codec, sipIndex), phase, phaseSeconds: 10, recording: null, away: { book, returning: false }, live: null });
        const working = reactionCard(reg, codec, info, { sip: sipAt(codec, sipIndex), phase, phaseSeconds: 10, recording: null, away: null, live: null });
        expect(card.heading).toBe(`On a break · reading ${book}`);
        expect(card.lines.slice(0, 2)).toEqual(working.lines.slice(0, 2));
        expect(card.lines[2].html).toMatch(/^The break is yours, not his\. He is not tired/); // the viewer's question, answered where it arises
        expect(card.lines[3].html).not.toBe(working.lines[3].html);
        expect(card.lines[3].html.replace(/title="[^"]*"/g, "")).not.toMatch(/drink|refus|extend|reach|bitter|sweet|yum|delicious|disgust|likes|hates|tastes/i);
        expect(audit(cardHtml(card) + trackHtml(reg, { sipIndex, phase, progress: 0.3, phaseSeconds: 10, paused: true }), reg)).toEqual([]);
      }
    }
    expect(trackHtml(reg, { sipIndex: 0, phase: "pour", progress: 0.3, phaseSeconds: 10, paused: true })).toContain('<ol class="held">');
  });

  it("reports the spikes the tea forces, live and tagged, in the right tense, and still claims nothing behind his lips", () => {
    const moment = { sip: sipAt(codec, 3), phase: "taste" as const, phaseSeconds: 12, recording: null, away: null };
    const before = reactionCard(reg, codec, info, { ...moment, live: null });
    const during = reactionCard(reg, codec, info, { ...moment, live: { seed: 3, steps: 412, sweetSpikes: 97, bitterSpikes: 31, slowdown: 50, touching: true } });
    const after = reactionCard(reg, codec, info, { ...moment, live: { seed: 3, steps: 1900, sweetSpikes: 480, bitterSpikes: 160, slowdown: 50, touching: false } });
    const text = (card: Card, line: number): string => card.lines[line].html.replace(/<[^>]*>/g, "");
    expect(text(before, 1)).toMatch(/^Will be driven once the tea is on his lips:/);
    expect(text(before, 2)).toMatch(/^His lips are not on the tea yet\./);
    expect(text(during, 1)).toMatch(/^Driven now:/);
    expect(text(during, 2)).toMatch(/^The tea is on his lips\. It has forced 97 spikes in his sweet taste neurons and 31 in the bitter ones, in 41\.2 ms of his time, a length set by his staged stay and not by the tea, shown 50 times slower, seed 3\./);
    expect(during.lines[2].html).toContain('data-q="model.time" data-prov="staged"'); // how long a trial runs is staged, so its length may not be tagged as the model's
    expect(during.lines[2].tags).toEqual(["model", "staged"]);
    expect(before.lines[2].tags).toEqual(["staged", "model"]); // no model number yet, but the line still speaks about the model
    expect(during.lines[1].tags).toEqual(["connectome", "model"]);
    expect(text(after, 1)).toMatch(/^Were driven while the tea was on his lips:/);
    expect(text(after, 2)).toMatch(/^The tea forced 480 spikes/);
    for (const card of [before, during, after]) {
      expect(text(card, 2)).toMatch(/He stays 12 s, a time that ignores the tea/);
      expect(card.footnote).toMatch(/No decision has been computed yet/);
      expect(audit(cardHtml(card), reg)).toEqual([]);
    }
    expect(during.lines[2].html).toContain('data-q="input.spikes" data-prov="model" data-src="live"');
    expect(text(during, 2)).toMatch(/his brain is dark: its wiring is not loaded yet/);
    expect(cardBodyHtml(during, false)).toContain('<details class="more">');
    expect(cardBodyHtml(during, true)).toContain('<details class="more" open>');
  });

  it("says he is on his way back, and nothing about tea, between the end of a break and the clock starting again", () => {
    const card = reactionCard(reg, codec, info, { sip: sipAt(codec, 3), phase: "taste", phaseSeconds: 12, recording: null, away: { book: bookAt(3), returning: true }, live: null });
    expect(card.heading).toBe("Back to the tea");
    expect(card.lines[3].html).toContain("Now, where was I?");
    expect(audit(cardHtml(card), reg)).toEqual([]);
  });

  it("names every coloured group of the cloud with the count the cloud file gives", () => {
    const text = legendHtml(reg, info).replace(/<[^>]*>/g, " ");
    for (const group of info.groups.filter((g) => g.id !== "none")) expect(text).toContain(group.points.toLocaleString("en-US"));
    expect(text).toMatch(/2\s+MN9/);
    expect(legendHtml(reg, info)).not.toContain('data-q="neurons.count"'); // these are points drawn, not the census count of a group
    expect(text).toMatch(/paint, not light/);
  });

  it("marks the step he is on and counts sips from one", () => {
    const html = trackHtml(reg, { sipIndex: 4, phase: "pour", progress: 0, phaseSeconds: 10, paused: false });
    expect(html).toContain('<li class="now">pour</li>');
    expect(html).toContain('<li class="done">brew</li>');
    expect(html).toContain('<li class="next">taste</li>');
    expect(html.replace(/<[^>]*>/g, "")).toContain("bowl 5"); // not "sip": nobody has established that he sips
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
    const html = lipsHtml(reg, dots, 50);
    expect(html.match(/<circle /g)?.length).toBe(72);
    expect(html.match(/fill="none"/g)?.length).toBe(info.mouthparts.filter((m) => !m.speaks).length);
  });
});
