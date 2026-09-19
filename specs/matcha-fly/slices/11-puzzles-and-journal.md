# 11 · Puzzles and journal

**Question:** do the experiments add up to understanding the player can state?

Needs slice 10.

## Contract

Delivers puzzles as data, each licensed by a lab verdict, and a journal that records what the player found. Does not deliver the ceremony.

## Seam

```ts
Puzzle  { id, brief, tools: ('sip'|'silence'|'activate'|'side')[], budget, goal, teaches, requires: mechanicId[] }
JournalEntry { puzzleId, recordingHashes[], unlockedNames[], at }
```

A build step fails if any puzzle requires a mechanic that is not enabled in `contracts/mechanics.json`, and that file already refuses to enable a mechanic without a `pass` verdict. One chain, one gate: puzzle → mechanic → verdict. Rule 1 of the spec becomes a build error. The recorded comparisons are mechanics too (`taste.shuffle`, `taste.gluflip`, `taste.rival`), enabled by slice 05. The journal lives in `localStorage`, wrapped so that a browser without it still plays.

First puzzles. Each teaches one true thing, and each goal is checked by replaying the player's stored recording, never by trusting a flag.

1. **Sweet first.** Find the most bitter sip he still drinks. Teaches: bitter is an active brake, not an absence.
2. **Blind tasting.** Mystery jars, one per taste population. Sort them by what he does. Teaches: the sensor, not the pattern, carries the meaning.
3. **Cut the brake.** Make him drink a bitter bowl by silencing one type. If slice 06 found no single cut that does it, the puzzle becomes "why can't one cut do it?", and a second cut is allowed as an exploratory run with the badge showing.
4. **The missing relay.** Find a single cut that stops him drinking sugar, if there is one. Then light one relay alone. Teaches: necessary is not sufficient, and relays are redundant.
5. **Scramble the wiring.** Same neurons, same synapse counts, random partners. Recorded. Teaches: the program is the wiring.
6. **One-sided sip.** Left side only. Do both MN9 neurons fire? The game reports what was measured.
7. **The assumption switch.** Glutamate excites. Recorded. Teaches: the wiring diagram does not contain signs.
8. **The rival.** A one-line rule plays beside the fly. Find a sip where they disagree. The rule was fitted on one set of seeds and is scored on another, so its accuracy is not flattered. Teaches: what the rest of the brain did, or did not, add.

The journal has four parts. **Names:** a type is "relay 3 (GNG015)" until a puzzle the player solved shows what it does; then it unlocks a nickname, such as "the bitter brake". **Didn't work:** one page per failed branch experiment, with its plot and what it means. **How male is this circuit:** the fraction of types in the taste-to-MN9 path that carry a dimorphism flag, drawn only from annotations. It should be near zero, which is the dataset's headline finding checked by hand. **Exit quiz:** optional, assembled from the player's own experiments.

## What the human sees

`/journal`, and puzzle cards on the bench.

## Verification

- The gate fails the build on a puzzle whose mechanic is missing, disabled or unlicensed.
- A nickname unlocks only when the stored recording, replayed, satisfies the goal.
- Puzzle answers equal the lab's tables.
- **Visual variable: the journal page's readability.** Shot, then `screenshot-critique`; `compare-screenshots` against the bench for consistency.
- **Human checkpoint, non-blocking.**

## Delegated

Copy, budgets, nickname wording, page design, whether the quiz ships.

## Must stay green

`make check`.

## Feedback that would change this slice

The quiz feels like school: drop it. Budgets are too easy or too hard: change budgets, never the circuit.
