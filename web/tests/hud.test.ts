// The words around the stage: every number tagged, in every phase of every sip, and the taste neurons where the dataset puts them.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Codec } from "../src/codec/codec";
import { audit, ref } from "../src/honesty/honesty";
import type { CloudInfo } from "../src/view/cloud";
import { cardBodyHtml, cardHeadHtml, footHtml, legendHtml, lipsHtml, stagedHtml, titleHtml, trackHtml } from "../src/view/hud";
import type { Card } from "../src/view/reaction";
import type { Stay } from "../src/view/replay";
import { lipLayout } from "../src/view/lips";
import { PHASES } from "../src/view/loop";
import { bookAt } from "../src/view/puppet";
import { quantities, reactionCard } from "../src/view/reaction";
import { sipAt } from "../src/view/rotation";

const root = new URL("../../", import.meta.url);
const codec: Codec = JSON.parse(readFileSync(new URL("contracts/codec/taste.codec.json", root), "utf8"));
const info: CloudInfo = JSON.parse(readFileSync(new URL("data/built/web/brain.cloud.json", root), "utf8"));
const reg = quantities();
const NEVER: Stay = { seconds: 8, why: "never", lastStep: null };
const DECODER = { window: [2000, 10000] as [number, number], extendAtLeast: 41, refuseAtMost: 6, evidence: { experiment: "E01-taste-law" } };
const LICENSED = { outcome: "extend" as const, windowCount: 63, decoder: DECODER };
const cardHtml = (card: Card): string => cardHeadHtml(card) + cardBodyHtml(card, true);

const STILL = { state: "still" } as const;

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
          + cardHtml(reactionCard(reg, codec, info, { sip: sipAt(codec, sipIndex), phase, phaseSeconds: 10, stay: NEVER, away: null, replayed: null, waiting: false, frozen: false, summary: null, verdict: null, bowl: 0, legs: STILL }));
        expect(audit(html, reg), `sip ${sipIndex}, ${phase}`).toEqual([]);
      }
    }
  });

  it("says what he reads on a break, keeps the sip on the card, and still says nothing about the taste of anything", () => {
    for (let sipIndex = 0; sipIndex < 25; sipIndex++) {
      for (const phase of PHASES) {
        const book = bookAt(sipIndex);
        const card = reactionCard(reg, codec, info, { sip: sipAt(codec, sipIndex), phase, phaseSeconds: 10, stay: NEVER, away: { book, returning: false, visit: sipIndex }, replayed: null, waiting: false, frozen: false, summary: null, verdict: null, bowl: 0, legs: STILL });
        const working = reactionCard(reg, codec, info, { sip: sipAt(codec, sipIndex), phase, phaseSeconds: 10, stay: NEVER, away: null, replayed: null, waiting: false, frozen: false, summary: null, verdict: null, bowl: 0, legs: STILL });
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

  it("reports what the recording holds, tagged as recorded, in the right tense, and gives no verdict", () => {
    const moment = { sip: sipAt(codec, 3), phase: "taste" as const, phaseSeconds: 12.4, stay: { seconds: 12.4, why: "silent", lastStep: 1150 } as Stay, away: null, waiting: false, frozen: false, summary: null, verdict: null, bowl: 0, legs: STILL };
    const counts = { seed: 1, slowdown: 50, pilot: true, inputSpikes: 1204, otherNeurons: 1987, readoutSpikes: 9, undrawable: 412, extension: 0, drunk: 0 };
    const before = reactionCard(reg, codec, info, { ...moment, replayed: null });
    const during = reactionCard(reg, codec, info, { ...moment, replayed: { ...counts, steps: 412, touching: true } });
    const after = reactionCard(reg, codec, info, { ...moment, replayed: { ...counts, steps: 1900, touching: false } });
    const late = reactionCard(reg, codec, info, { ...moment, replayed: null, waiting: true, frozen: false, summary: null, verdict: null, bowl: 0, legs: STILL });
    const text = (card: Card, line: number): string => card.lines[line].html.replace(/<[^>]*>/g, "");
    expect(text(before, 1)).toMatch(/^Once the tea is on his lips:/);
    expect(text(before, 2)).toMatch(/^His lips are not on the tea yet\. He stays 12\.4 s: MN9 last fires at 115\.0 ms of his time, and his lips stay on the tea until then and a breath longer\./);
    expect(before.lines[2].html).toContain('data-q="rec.readoutLast" data-prov="model" data-src="recorded"');   // the number his stay is made from stands beside it
    expect(text(during, 1)).toMatch(/^Now:/);
    expect(text(during, 2)).toMatch(/^The tea is on his lips\. In 41\.2 ms of his time his taste neurons fired 1,204 times, 1,987 other neurons joined in across his brain and nerve cord, and MN9, the pair that lifts his proboscis, fired 9 times\. A pilot recording, not a verdict\. He stays /);
    // what cannot be drawn, the slowdown and the seed are folded away with what he was served, and are still said
    expect(text(during, 5)).toBe("Tasting: 412 of the spikes so far came from neurons with no position to draw. A pilot recording of his whole brain, seed 1: the taste law has not been tested yet, so this is what was measured, not a verdict. Shown 50 times slower than his time.");
    expect(text(before, 5)).toBe("Nothing is being replayed: he tastes nothing and his legs are still.");
    expect(text(after, 1)).toMatch(/^While the tea was on his lips:/);
    expect(text(after, 2)).toMatch(/^The tea was on his lips\./);
    expect(text(late, 2)).toMatch(/^The recording of this bowl has not arrived yet, so nothing is shown\./);
    expect(during.lines[5].html).toContain('data-q="rec.undrawable" data-prov="model" data-src="recorded"');
    for (const id of ["rec.taste", "rec.neurons", "rec.readout"]) expect(during.lines[2].html).toContain(`data-q="${id}" data-prov="model" data-src="recorded"`);
    expect(during.lines[2].html).toContain('data-q="linger.seconds" data-prov="staged"');   // his brain sets when MN9 falls silent; turning that into seconds is ours
    expect(during.lines[2].html).toContain('data-q="model.time" data-prov="staged"');
    expect(during.lines[2].tags).toEqual(["model", "staged"]);
    expect(during.lines[1].tags).toEqual(["connectome", "model"]);
    for (const card of [before, during, after, late]) {
      expect(card.footnote).toMatch(/No verdict has been licensed yet/);
      expect(text(card, 2)).not.toMatch(/drinks|drank|refus|likes|enjoy|delicious|disgust/i);
      expect(audit(cardHtml(card), reg)).toEqual([]);
    }
    expect(cardBodyHtml(during, false)).toContain('<details class="more">');
    expect(cardBodyHtml(during, true)).toContain('<details class="more" open>');
  });

  it("gives the true reason for the length of his stay, which is not always that MN9 fell silent", () => {
    const at = (stay: Stay): string => reactionCard(reg, codec, info, { sip: sipAt(codec, 3), phase: "taste", phaseSeconds: stay.seconds, stay, away: null, replayed: null, waiting: false, frozen: false, summary: null, verdict: null, bowl: 0, legs: STILL }).lines[2].html.replace(/<[^>]*>/g, "");
    expect(at({ seconds: 8, why: "never", lastStep: null })).toMatch(/He stays 8 s, the least he ever does: in this recording MN9 never fires\./);
    expect(at({ seconds: 8, why: "early", lastStep: 40 })).toMatch(/the least he ever does: MN9 last fires at 4\.0 ms of his time, and he is never rushed\./);
    expect(at({ seconds: 20, why: "longest", lastStep: 2990 })).toMatch(/He stays 20 s, the most he ever does: MN9 is still firing at 299\.0 ms of his time, later than the longest stay can show\./);
    expect(at({ seconds: 8, why: "never", lastStep: null })).not.toMatch(/fallen silent|until then/);
  });

  it("does not call a taste that is absent a drive at zero", () => {
    const water = reactionCard(reg, codec, info, { sip: { teaId: null, scoops: 0, sweets: 0 }, phase: "taste", phaseSeconds: 8, stay: NEVER, away: null, replayed: null, waiting: false, frozen: false, summary: null, verdict: null, bowl: 0, legs: STILL });
    const heard = water.lines[1].html.replace(/<[^>]*>/g, "");
    expect(heard).toMatch(/34 sweet taste neurons not driven · 38 bitter not driven/);
    expect(heard).not.toMatch(/0 Hz/);
  });

  it("never says sip: nothing has licensed the claim that he sips", () => {
    const dots = lipLayout(info.mouthparts);
    let seen = titleHtml(reg, info) + lipsHtml(reg, dots, 50) + legendHtml(reg, info) + stagedHtml(reg, reg.ids()) + footHtml();
    const replayed = { seed: 1, steps: 400, slowdown: 50, touching: true, pilot: true, inputSpikes: 9, otherNeurons: 9, readoutSpikes: 1, undrawable: 1, extension: 0, drunk: 0 };
    for (let sipIndex = 0; sipIndex < 25; sipIndex++) {
      for (const phase of PHASES) {
        for (const more of [{ replayed: null, waiting: false, away: null }, { replayed: null, waiting: true, away: null }, { replayed, waiting: false, away: null }, { replayed: null, waiting: false, away: { book: bookAt(sipIndex), returning: false, visit: 1 } }]) {
          const card = reactionCard(reg, codec, info, { sip: sipAt(codec, sipIndex), phase, phaseSeconds: 9, stay: { seconds: 9, why: "silent", lastStep: 500 }, frozen: sipIndex % 2 === 0, summary: phase === "clean" ? replayed : null, verdict: sipIndex % 3 ? LICENSED : null, bowl: sipIndex, legs: STILL, ...more });
          seen += trackHtml(reg, { sipIndex, phase, progress: 0.4, phaseSeconds: 9, paused: false }) + cardHtml(card);
        }
      }
    }
    expect(seen.replace(/data-q="[^"]*"/g, "")).not.toMatch(/\bsips?\b/i);   // the words on the page, and the hover text in its title attributes
    for (const id of reg.ids()) expect(`${reg.get(id).label} ${reg.get(id).explain}`).not.toMatch(/\bsips?\b/i);
  });

  it("holds a moment for reading, and keeps what his brain did on the card while he cleans up", () => {
    const base = { sip: sipAt(codec, 3), phaseSeconds: 12, stay: NEVER, away: null, replayed: null, waiting: false, verdict: null, bowl: 3, legs: STILL };
    const summary = { seed: 1, steps: 1500, slowdown: 50, touching: false, pilot: true, inputSpikes: 900, otherNeurons: 2100, readoutSpikes: 7, undrawable: 50, extension: 0, drunk: 0 };
    expect(reactionCard(reg, codec, info, { ...base, phase: "taste", frozen: true, summary: null }).heading).toMatch(/^Paused · Tasting · /);
    expect(reactionCard(reg, codec, info, { ...base, phase: "taste", frozen: false, summary: null, verdict: null, bowl: 0, legs: STILL }).heading).toMatch(/^Tasting · /);
    const cleaning = reactionCard(reg, codec, info, { ...base, phase: "clean", frozen: false, summary });
    expect(cleaning.lines[2].html.replace(/<[^>]*>/g, "")).toMatch(/^With the bowl he has just tasted, in 150\.0 ms of his time, his taste neurons fired 900 times, 2,100 other neurons joined in across his brain and nerve cord, and MN9, the pair that lifts his proboscis, fired 7 times\. Nothing of it is left in him/);
    expect(audit(cardHtml(cleaning), reg)).toEqual([]);
    expect(reactionCard(reg, codec, info, { ...base, phase: "clean", frozen: false, summary: null, verdict: null, bowl: 0, legs: STILL }).lines[2].html).toMatch(/^Tasting is over\./);
  });

  it("gives a verdict only when one is licensed, from the decoder's numbers, once he has lifted his head", () => {
    const base = { sip: sipAt(codec, 3), phase: "taste" as const, phaseSeconds: 20, stay: { seconds: 20, why: "longest", lastStep: 9990 } as Stay, away: null, waiting: false, frozen: false, summary: null, bowl: 4, legs: STILL };
    const counts = { seed: 1, steps: 1200, slowdown: 50, pilot: false, inputSpikes: 800, otherNeurons: 2000, readoutSpikes: 14, undrawable: 30 };
    const text = (card: Card, line: number): string => card.lines[line].html.replace(/<[^>]*>/g, "");
    const unlicensed = reactionCard(reg, codec, info, { ...base, verdict: null, replayed: { ...counts, touching: false, extension: 0, drunk: 0 } });
    expect(text(unlicensed, 2)).not.toMatch(/decoder|drinks|refuses|drunk/);
    expect(text(unlicensed, 3)).toBe("(he says nothing)");
    const drinking = reactionCard(reg, codec, info, { ...base, verdict: LICENSED, replayed: { ...counts, touching: true, extension: 1, drunk: 0.42 } });
    expect(text(drinking, 2)).toMatch(/His proboscis is out while MN9 fires, and he has drunk 42% of the cup\./);
    expect(text(drinking, 2)).not.toMatch(/the decoder reads/);            // the verdict is of the whole second: not said while his lips are still on the tea
    expect(text(drinking, 3)).toBe("(he says nothing)");
    const after = reactionCard(reg, codec, info, { ...base, verdict: LICENSED, replayed: { ...counts, touching: false, extension: 0, drunk: 0.9 } });
    expect(text(after, 2)).toMatch(/Over the whole recorded second MN9 fired 63 times after the first fifth of it: at or above 41, so the decoder reads: he drinks\./);
    expect(after.lines[2].html).toContain('data-q="rec.window" data-prov="model" data-src="recorded"');
    expect(["Mm. Yes.", "I will have this one.", "Again, please."]).toContain(text(after, 3));
    const refused = reactionCard(reg, codec, info, { ...base, verdict: { outcome: "refuse", windowCount: 2, decoder: DECODER }, replayed: { ...counts, touching: false, extension: 0, drunk: 0 } });
    expect(text(refused, 2)).toMatch(/MN9 fired 2 times after the first fifth of it: at or below 6, so the decoder reads: he refuses\./);
    expect(["No. Not this one.", "Thank you, no.", "I will leave this bowl."]).toContain(text(refused, 3));
    const unsure = reactionCard(reg, codec, info, { ...base, verdict: { outcome: "neither", windowCount: 20, decoder: DECODER }, replayed: { ...counts, touching: false, extension: 0, drunk: 0.1 } });
    expect(text(unsure, 2)).toMatch(/between 6 and 41, so the decoder reads neither\./);
    for (const card of [drinking, after, refused, unsure]) {
      expect(card.footnote.replace(/<[^>]*>/g, "")).toMatch(/The verdict is not puppetry: it is decoded from MN9's recorded spikes by thresholds that experiment E01-taste-law fixed/);
      expect(audit(cardHtml(card), reg)).toEqual([]);
    }
    // his words follow the outcome and nothing else: another tea, another stay, the same outcome and bowl give the same words
    const other = reactionCard(reg, codec, info, { ...base, sip: sipAt(codec, 17), phaseSeconds: 9, verdict: LICENSED, replayed: { ...counts, touching: false, extension: 0, drunk: 0.2 } });
    expect(text(other, 3)).toBe(text(after, 3));
  });

  it("says he is on his way back, and nothing about tea, between the end of a break and the clock starting again", () => {
    const card = reactionCard(reg, codec, info, { sip: sipAt(codec, 3), phase: "taste", phaseSeconds: 12, stay: NEVER, away: { book: bookAt(3), returning: true, visit: 1 }, replayed: null, waiting: false, frozen: false, summary: null, verdict: null, bowl: 0, legs: STILL });
    expect(card.heading).toBe("Back to the tea");
    expect(card.lines[3].html).toContain("Now, where was I?");
    expect(audit(cardHtml(card), reg)).toEqual([]);
  });

  it("names every coloured group of the cloud with the count the cloud file gives", () => {
    const text = legendHtml(reg, info).replace(/<[^>]*>/g, " ");
    for (const group of info.groups.filter((g) => g.id !== "none")) expect(text).toContain(group.points.toLocaleString("en-US"));
    expect(text).toMatch(/2\s+MN9/);
    expect(legendHtml(reg, info)).not.toContain('data-q="neurons.count"'); // these are points drawn, not the census count of a group
    expect(text).toMatch(/Colour is paint/);
    expect(text).toMatch(/Light is spikes/);
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

describe("what he says about his books", () => {
  it("has several lines for every book, none of them about the taste of anything, none with a bare number, a quotation or his being worn out", async () => {
    const { BREAK_LINES, breakLine } = await import("../src/view/reaction");
    const { BOOKS } = await import("../src/view/puppet");
    expect(Object.keys(BREAK_LINES).sort()).toEqual([...BOOKS].sort());
    const all = Object.values(BREAK_LINES).flat();
    expect(new Set(all).size).toBe(all.length);                       // no line under two titles, none twice
    for (const [book, lines] of Object.entries(BREAK_LINES)) {
      expect(lines.length, book).toBeGreaterThanOrEqual(8);
      for (const line of lines) {
        expect(line.length, line).toBeLessThanOrEqual(110);
        // the words on a break may say nothing about tea as a taste, and the model has no fatigue, hunger or memory for him to speak of
        expect(line, book).not.toMatch(/drink|refus|extend|reach|bitter|sweet|yum|delicious|disgust|likes|hates|tastes|tired|hungry|sleepy|remember|memory|forgot/i);
        expect(line, book).not.toMatch(/\d|["“”]/);
      }
      // every line of a book is heard before one is heard twice, whether the bowls go by or the breaks do
      expect(new Set(lines.map((_, visit) => breakLine(book, 3, visit))).size).toBe(lines.length);
      expect(new Set(lines.map((_, bowl) => breakLine(book, bowl, 2))).size).toBe(lines.length);
    }
    expect(breakLine("a book he does not own", 0, 0)).toBe("One more chapter.");
  });

  it("puts the line for this book, this bowl and this break on the card, tagged as staged", () => {
    const at = (visit: number): string => reactionCard(reg, codec, info, { sip: sipAt(codec, 3), phase: "brew", phaseSeconds: 4.5, stay: NEVER, away: { book: "Demons", returning: false, visit }, replayed: null, waiting: false, frozen: false, summary: null, verdict: null, bowl: 0, legs: STILL }).lines[3].html;
    expect(at(1)).not.toBe(at(2));
    expect(at(1)).toContain('data-prov="staged"');
    expect(at(1).replace(/<[^>]*>/g, "")).toBe("Everyone follows someone who follows no one. I follow the lamp. At least it is honest.");
  });
});
