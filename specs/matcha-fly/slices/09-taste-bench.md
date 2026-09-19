# 09 · Taste bench

**Question:** does a real wiring diagram refusing your tea feel like something?

Needs slices 07 and 08. This is the first live playable.

## Contract

Delivers one route where the player composes a sip, bets, runs a one-second trial on the live engine and watches it back slowly. Does not deliver the circuit view (10), lesions (10e), puzzles (11) or any ceremony (12).

## Since the living view

The bench is not a separate page any more. It is what pausing the endless loop of V1 opens: the player composes the next sip instead of the rotation choosing it, and the live engine runs it instead of a recording being replayed. Resume hands control back to the rotation.

## The loop

Compose: pieces of sweet, level 0 to 4; a tea from the menu and one to three scoops of it, which the codec's menu turns into a bitter level 0 to 4; left side, right side or both. These are the codec's levels and no others. The bitter level a choice resolves to is shown beside it, and a line under the menu says what a fly cannot taste: two teas of the same tier are the same tea to him. Bet: will he drink? Run: the Worker computes the trial. Replay: a scrubber over the second, at one fiftieth of real speed by default, with the speed shown. Outcome: `extend`, `hesitate` or `refuse`, from the codec's decoder.

## Seam

```ts
// web/src/codec/   lookups over contracts/codec/taste.codec.json, pinned by fixtures
composeTrial(sip: {sweet: number, bitter: number, side: 'left'|'right'|'both'}, seed): TrialSpec
decode(decoderId, recording): { outcome: 'extend'|'hesitate'|'refuse', spikes: number, windowSteps: number }
```

The route talks to `src/client` and `src/codec` and to nothing else below them. It never sees a rate, a threshold or a weight.

On screen: the MN9 meter is the spike count of both MN9 neurons in the decoder's stated window, as a number and a bar. It does not ease or smooth. The proboscis is a placeholder shape with three poses. Until slice 12b replaces it, the placeholder is the product, not scaffolding to hide. A badge reads "identical to the whole-brain run" when the trial is inside the envelope and no sentinel fired, and "exploratory: outside the verified envelope" otherwise. A seed chooser offers only the verified seeds.

## What the human sees

`/bench/taste`. The moment to look for: three sweets and no matcha, he drinks; add four scoops, he refuses; and the player did not know which way two sweets and two scoops would go.

## Verification

- A Playwright flow composes three sips whose expected outcomes are read from slice 05's verdict tables, not typed into the test, and checks them.
- For an in-envelope sip, the live `spikeHash` equals the oracle's recorded hash for the same spec.
- Same seed and same sip give the same hash twice.
- The DOM audit finds every quantity tagged. The meter is `model`, source `live`. The proboscis pose is `staged`, driven by a `model` decision.
- An empty recording shows zero on the meter and no motion.
- **Visual variable: can a newcomer see cause become effect?** Crop: the sip, the meter, the proboscis. Out of scope: art, colour, the fly's body, the room.
- Run `screenshot-critique` on the Playwright shots as the last check. Run `compare-screenshots` against the `/atlas` reveal panel from slice 06, to judge whether the two pages read as one product.
- **Human checkpoint, non-blocking**, with `preview-shots` and a five-minute window.

## Delegated

Layout, placeholder art, scrubber design, copy, framework.

## Must stay green

`make check`. Parity from slice 08. E01 on the subgraph.

## Feedback that would change this slice

The user wants live dials and continuous pouring: that is parked, and promoting it displaces something else. The pose is unreadable: change the pose, never the decoder.
