# Evidence, slice V3: he moves, and his nerves answer (pilot, 2026-09-20)

**What the user asked:** "everytime he moves, i need his movement neurons gets activated (if any) too - but it has to be real not staged."

**What is real here, and what is not.** We move his legs: that is puppetry and always will be, since no fly brain brews tea. A moving knee is a genuine stimulus to the sensors of that knee. While the puppet moves a pair of legs, the trial drives that pair's hook and claw neurons and nothing else, and every other spike, in his cord, his brain and his leg motor neurons, is the model running on his wiring. His motor neurons firing does not move the puppet, and the page says so on every card.

## The recordings (`data/built/web/recordings/move-*.json`, 300 ms, seed 1, base model, 100 Hz)

| Movement | Sensors driven | Neurons that answered | Leg motor neurons that fired | Their spikes | Other motor neurons that fired | Their spikes |
|---|---|---|---|---|---|---|
| `walk`: all six legs | 151 (60 hook, 91 claw) | 3,490 | 79 of 373 | 463 | 162 | 1,125 |
| `front`: the front pair | 15 (10 hook, 5 claw) | 109 | 16 of 373 | 26 | 0 | 0 |

Every figure in this section was recounted from the committed files on 2026-09-20, after a reviewer found that the first version of this note quoted a scratch run.

How fast the walk's answer builds, in his time (on screen at fifty-fold slowdown): 10 ms (0.5 s) 26 neurons; 20 ms (1 s) 235 neurons and 16 leg motor spikes; 40 ms (2 s) 782 and 40; 60 ms (3 s) 1,044 and 70; 100 ms (5 s) 2,426 and 150; 300 ms (15 s) 3,490 and 463. A short walk shows little, because it is a short stimulus. The front pair's: 40 ms 13 neurons and 1 spike; 100 ms 94 and 19; 300 ms 109 and 26.

Who answers the walk, by the dataset's superclass: 1,354 central brain neurons, 1,211 cord interneurons, 228 descending, 222 cord motor and 210 ascending neurons, and about 200 of the visual system. The front pair's answer stays in the cord: 89 interneurons, 16 motor neurons, 4 ascending neurons, no brain neuron.

**Unexpected, and now said on the page:** his leg motor neurons are a minority of the motor neurons that answer a walk, 79 against 162, 463 spikes against 1,125, and nine of the ten busiest motor neurons drive the power muscles of his wings (DLMn), each firing 30 to 38 times, level with the busiest leg motor neuron (a middle-leg Ti extensor, 34). The model has no state that says "I am standing on the ground", so nothing holds flight back. The card counts the other motor neurons beside his legs' (`move.otherMotor`), and says in its tooltip what the busiest of them are. The busiest leg pool holds about a fifth of the leg motor spikes, never most of them, and the card says "busiest", not "most".

**One sensor nobody can hear:** body 833439, a front-leg hook neuron, has no out-edge at the graph's threshold of five synapses. It is driven and counted among the 15 and can reach nobody (`lab/tests/test_legs_circuit.py` holds the list to exactly this one).

**More drive does not mean more answer.** The first binding, before the census was tightened to rows the dataset itself calls chordotonal organ, drove 154 sensors and got 3,274 neurons and 70 leg motor neurons; the committed 151 get 3,490 and 79. So nothing here may be called an upper or a lower reading, and the codec's note no longer does.

## Exploration runs that were not used to decide anything

Scratch runs of the same trial with 155 sensors (the census's 151, three rows subclassed only "leg", and one SNpp51 of class unknown_sensory that the census does not bind): hook and claw at 100 Hz → 3,206 neurons, 72 leg motor neurons, 415 spikes; hook alone → 3,501 neurons, 80 leg motor neurons, 325 spikes; hook alone, front pair, 11 neurons → 23 neurons, 1 motor spike; hook and claw at 50 Hz → 1,422 neurons, 56 leg motor neurons, 222 spikes. The slice had said "claw and hook" before any of this ran, and that is what was built (choices M7).

## What holds it

- Lab, `lab/tests/test_recordings.py`: a movement's spec drives the six (or two) census groups at the codec's threshold and activates nothing; the codec on disk is the builder's and names only bound groups; the index's summaries are recounted from the recordings; spike hashes are recomputed; no driven neuron is a motor neuron; with the graph present, a spec run again gives the same spikes.
- Page, `web/tests/body.test.ts`: his body is stepped at sixty frames a second through a bowl of tea, a bowl of hot water, and eighteen breaks taken at three moments of each of the six steps. In every run of frames that claims no movement, no knee travels more than what cannot be seen; every claim that lasts is a movement of those knees, and of the front pair alone when the front pair is claimed. It caught, on its first run, his legs snapping to standing when he finished stepping up to the cup, and that was fixed in the puppet. A frame with no time in it changes nothing; a still does not march on the spot.
- Page, `web/tests/movement.test.ts`: a pair said to move has knees that move and a pair not said to has no joint that changes (standing, reading, leaning, holding still; whisking, wiping, sifting, lifting; walking, stance included); the movement clock counts only the time it is given; still legs and a missing recording light nothing; one movement's recording is refused for another; the page's counts equal the lab's for both committed recordings; every number on the line goes through the registry and passes the audit.
- `lab/tests/test_legs_circuit.py`: the legs lock reproduces byte for byte from its circuit file; every bound sensor is of the stated type, class, subclass and nerve, on a known side, in one group only; the per-type synonym counts in the evidence text are recounted from the table.
- `make check`: lab tests, page tests, typecheck, data guard, mechanics gate, all green.

## Shots (stills from the address, headless Chrome, 1440 × 900)

In a still the address says for how long his legs have been moving (`&moved=` seconds). The values below are what the running page reaches at those moments, measured on it: a walk gets to 36 to 48 ms of his time, whisking to 60 ms, and pouring to 120 ms, because whisking runs into pouring without a rest and both are work of the front pair.

- `walk-all-six-legs.jpg`: `?sip=5&phase=taste&at=0.1&moved=1.8`. He steps up to the cup; light through the cord, large points are leg motor neurons, and the first brain neurons answer.
- `whisk-front-legs.jpg`: `?sip=4&phase=brew&at=0.95&moved=3`. Whisking; only the front of the cord, where the front legs' neurons lie.
- `pour-front-legs.jpg`: `?sip=4&phase=pour&at=0.5&moved=5`. He tips the bowl, front legs up with it (choices M11); the same recording, further on.
- `still-dark.jpg`: `?sip=4&phase=taste&at=0.02`. He stands and looks at the cup: legs still, nothing driven, cloud dark.

- `walk-1280x720.jpg`: the same moment in a smaller window. The card's height is tied to the window's, and it scrolls before it covers him or his cord.

## What a fresh-eyes review caught (2026-09-20, three reviewers, each finding checked by a second agent; all 22 findings were confirmed)

- The card said the leg motor spikes were "most of them in" the busiest pool. Untrue: about a fifth. Now "the busiest pool so far, with N of them", and a test on the real recordings holds that it is never a majority.
- The card counted only his leg motor neurons, which read as a tidy, specific answer. The others are now counted beside them (choices M13).
- "Nobody has recorded these neurons in a walking fly" was false (calcium imaging exists; spike rates do not), and "an upper reading" was unsupported. Both gone from the page, the codec and the choices.
- This note quoted a scratch run. Recounted from the committed files.
- The census pooled its synonym counts and swept in three rows the dataset does not call chordotonal. Per-type counts, a stricter selector, a choice on record (M12), and a test that holds the legs lock to its circuit file.
- A bad `&moved=` lit every neuron of the recording beside a card of zeros. Refused now, in the address, in `movedAt` and in `light()` itself.
- Picking his work up after a break moved his front knees for most of a second, unclaimed. Whether he lifts is now read off what his front legs did in the frame (`web/src/view/body.ts`).
- On a short window the card covered him and his cord; on a wide, short one its second column was cut off.
- The evidence stills used longer movements than the running page reaches. Retaken at measured values.

**Visual variable, can a newcomer tell which legs move from the cord alone?** Between walk and front work, yes: whole cord against its front tip. Between left and right, no: both sides are always driven together. Not yet put to fresh eyes.

**Human checkpoint:** open.
