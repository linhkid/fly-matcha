# Evidence for slice 05, the taste law: two attempts, two fails

2026-09-19. **He is not licensed to drink.** The verdicts and reports of both attempts are in this folder. Nothing was tuned.

## E01, as the slice pre-registered it: fail

Committed before any confirmation seed (`3011304`), with the criteria the slice wrote before any data existed. At the published weight, 0.275 mV, ten confirmation seeds:

| Claim | Result | Observed |
|---|---|---|
| P1 drive: sweet 3 makes MN9 fire 32 times or more, in 9 of 10 seeds | **fail** | 13, 22, 7, 7, 11, 9, 9, 7, 7, 11: never |
| P3a brake: bitter 3 cuts it by 70% or more, same seed, 9 of 10 | passes at the shipped model | a full cut in nine seeds, 71% in the tenth |
| P3b brake is monotone along bitter 0 to 4 | passes at the shipped model | means 10.3, 7.3, 3.2, 0.2, 0.0 |
| P2, P4, P5, P7 | not run | the pre-registered early stop: a claim passes only if it passes at the shipped model, so the verdict was decided |

Sweet does drive MN9 on the male wiring, and bitter does brake it. But at 100 Hz the drive is a third of what the claim asked for. At 200 Hz it is strong: the pilot seeds gave 69, 75 and 83.

## The fallback the slice declared in advance, and what the calibration showed

Fallback 2: recalibrate the weight on pilot seeds by the published rule, sweet at 100 Hz giving about 80% of the maximum MN9 rate. How to carry it out was written into the slice before the calibration ran (`d5800d5`). Pilot seeds 0 to 2, MN9 counts:

| Weight, mV | sweet 3 | sweet 4 | ratio of means |
|---|---|---|---|
| 0.30 | 27, 28, 25 | 95, 112, 102 | 0.26 |
| **0.35** | 111, 18, 60 | 93, 108, 22 | **0.85** |
| 0.40 | 28, 36, 30 | 210, 193, 79 | 0.19 |
| 0.45 | 2, 9, 34 | 280, 53, 44 | 0.12 |
| 0.50 | 3, 23, 6 | 332, 108, 339 | 0.04 |
| 0.60 | 1, 4, 1 | 365, 15, 371 | 0.01 |
| 0.70 | 6, 7, 13 | 12, 15, 24 | 0.51 |

By the rule the weight is 0.35 mV. The table says more than that. **A stronger synapse does not mean a stronger response**: above 0.40 mV sweet 3 drives MN9 less and less, because the inhibition it recruits grows faster than the excitation. And from 0.35 mV up the same sip lands in one of two states from seed to seed, MN9 busy or MN9 nearly silent. There is no plateau here to stand on, and no weight at which the published calibration rule holds steadily.

## E01b, at the calibrated weight, fresh seeds 200 to 209: fail

| Claim | Result | Observed |
|---|---|---|
| P1 drive | **fail, by one seed** | 38, 58, 48, 53, 61, **0**, 35, 49, 41, **3**: eight of ten |
| P3a brake | passes at the shipped model | a full cut in all nine seeds that had anything to cut |
| P3b monotone | passes at the shipped model | means 38.6, 16.8, 3.2, 0.1, 0.0 |

Eight seeds look like the published result. In two the network fell into its other state and MN9 stayed silent under the same sweet input. The criterion asked for nine, and was written before the data. It stays failed.

## What this means

- The taste law, as pre-registered from the female-brain paper, does not hold on this model of the male wiring: not at the published weight, and not robustly at the recalibrated one. That is a finding about this model and this connectome, and it is what the project exists to find out honestly.
- The brake is solid in both attempts. The drive is real but needs more input than the paper's, and the model is bistable where it is strong enough.
- One rerun is left by the slice's rules. Running the same claim again hoping for nine seeds would be fishing. None of the slice's four fallbacks covers "eight of ten, because the network has two states", so the next step is the user's to choose.
- `contracts/mechanics.json` keeps `taste.drink` and `taste.brake` switched off, and `make check` holds them there. The page's drinking path is built and tested, and cannot run.

## The harness did its job

Pre-registrations committed before their runs; ledgers written before the first seed; E01's failure on record before E01b existed; the calibration rule written before the calibration; early stops that saved about four hours of computing that could not have changed either verdict; both verdicts reproduce byte for byte.
