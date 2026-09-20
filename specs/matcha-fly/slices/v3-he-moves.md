# V3 · He moves, and his nerves show it

**Question:** when he lifts, sifts, whisks, pours, wipes and walks, can his own nervous system be seen taking part, without pretending that his brain decided to brew tea?

Asked for by the user on 2026-09-19: "we know fly cannot brew matcha, but can we force it to use his legs to lift and motions? so that it can show at the 'on the cloud' and in the brain image as well", and then: "if he moves, the neuron in his brain has to react to that too. clean, sift etc too." Stage A needs V1 only. Stage B needs slice 03, and so the user's yes for 508 MB.

**Built 2026-09-20, as a pilot, and not as the text below first planned it.** The user said: "everytime he moves, i need his movement neurons gets activated (if any) too - but it has to be real not staged." That rules out Stage A, in which we would have forced his motor neurons to match the puppet: those spikes would have been ours. What was built is route 2, his sensing, shown the way V2 shows tasting: pilot recordings, no claim.

- The legs census gained six groups, the hook and claw neurons of each pair of legs' knee sensors (`sens.hook.fl` … `sens.claw.hl`, 151 neurons, every one a row the dataset itself calls chordotonal organ; `circuits/legs.circuit.json` version 2). The front leg nerve is thinly traced here: 15 neurons against 67 and 69. The link from type to "hook" or "claw" is a handful of labelled hind-leg neurons per type, and the census says so type by type.
- `contracts/codec/legs.codec.json` says what a moving leg does to them: both kinds, both sides, 100 Hz, for as long as the pair moves. Two movements exist, because the puppet makes two: `walk` (all six legs) and `front` (the front pair: lifting, sifting, whisking, wiping).
- `python -m flylab web recordings` records his whole nervous system under each, 300 ms, seed 1, base model: **walk** 3,490 neurons beyond the sensors, 79 of his 373 leg motor neurons firing 463 times, and 162 motor neurons of other parts of him firing 1,125 times, the wing's power muscles busiest among them; **front** 109 neurons, all in the cord, 16 leg motor neurons, 26 spikes. Nothing drives a motor neuron in these trials.
- `web/src/view/body.ts` makes his body's motion out of the ceremony's pose, his walk and his breaks, and `web/src/view/gait.ts` answers "which knees are moving now?" from it. Tests hold both to the kinematics, frame by frame through whole bowls and breaks: a pair said to move has knees whose angle changes, a pair not said to has no joint that changes. For that to be true of walking, the puppet's knees now work through stance as well as swing, and his front legs go up and down with what he lifts and shake the sifter.
- While a pair moves, `web/src/view/movement.ts` replays that movement's recording from its start, at the view's slowdown, in the same layer of light as tasting, with his leg motor neurons drawn larger. Still legs: nothing driven, nothing lit. The card has a line, "His legs", with every number tagged; it names the busiest leg pool as the busiest, not as most, and counts the motor neurons that are not of his legs beside his legs'.
- **No experiment has run, so nothing is claimed**: not that this is walking, not that these motor neurons would move him, not that the response is specific to these sensors. E-move-1 to 3 below still stand, and any sentence beyond "this fired" waits for them. The puppet is moved by us, and the page says so on every card.

Evidence: `assets/evidence/v3/`.

## The honest shape of it

No fly brain brews tea, so the ceremony stays a puppet show. Two things about a moving fly are real in this dataset, and both can be shown:

1. **What pulls his legs.** His 373 leg motor neurons are all in the cloud, in the nerve cord, and the dataset names most of them for the muscle they drive (`circuits/legs.circuit.json`, 53 pools, census passed 2026-09-19). We can move the puppet *through* them: when the puppet bends a knee, the pool that bends that knee is forced, and those neurons flash where they sit. This is the experimenter's hand, as in an activation experiment, and the page must say so: **"driven by us"**, never "he decided".
2. **What he feels of his own movement.** 3,565 sensory neurons enter by his leg nerves, 392 of them from the chordotonal organs that sense joint position and movement. A staged movement is a genuine stimulus to them, exactly as staged tea is a genuine stimulus to his taste neurons. What the cord and the brain make of that stimulus is the model's to compute, and that part is **his**.

Route 2 is the one that answers "his brain has to react". Route 1 is the one that shows at once.

## Stage A, no download: the marionette's strings are his own motor neurons

- Each frame the puppet's joint angles (from `web/src/view/fly.ts`) are turned into drive for named pools, per leg and side, through a mapping that is ours and is tagged `staged`. The spikes are forced by the rule of `contracts/MODEL.md`, computed live by `web/src/engine/`, tagged `model`, `live`, and lit by `light()` and nothing else.
- The leg motor neurons get their own small set of points in the cloud, so that lighting them does not rewrite 138,556 colours a frame.
- Leg sensory neurons have no cell body in the volume. Like the taste neurons they are drawn where they are: on his legs, one row per leg.
- A drive that follows a movement changes from step to step. `contracts/TRIAL.md` allows a neuron one drive with one threshold, so this live display is **not** a trial. Stage B's recordings use conforming trials, or TRIAL.md gains piecewise drives as a new version.

### The mapping, from papers (research pass, 2026-09-19; sources below)

| Puppet movement | Pools forced | Confidence |
|---|---|---|
| Whole leg swings forward (start of a step) | Tergopleural/Pleural promotor (front leg only by name), Sternal anterior rotator | high |
| Whole leg pulls back and out (pushing the body along) | Pleural remotor/abductor, Sternal posterior rotator | high |
| Leg **lifts** off the ground | **Tr flexor**, Acc. tr flexor | high, medium |
| Leg **pushes down** | **Tr extensor**, Tergotr., Sternotrochanter | high |
| Knee bends | Ti flexor, Acc. ti flexor | high, medium-high |
| Knee straightens | Ti extensor | high |
| Foot up, foot down | Ta levator, Ta depressor (named in the front leg only; direction from the name alone) | medium |
| Claw grips | ltm, ltm1-tibia, ltm2-femur | target high, movement medium |
| *never driven* | Fe reductor: its joint is nearly fused and its function is unknown | high |

Trochanter is the trap: **flexing** the coxa-trochanter joint **lifts** the femur. And the front leg runs opposite to the hind leg in walking: its knee flexes in stance, pulling the body forward, so "flexor means swing" is wrong for the legs he works with. Middle and hind legs are inferred from the front leg by serial homology, one step less certain; 24 middle-leg and 21 hind-leg motor neurons carry only serial names and are never driven.

## Stage B, needs slice 03: his cord and brain react

Pre-registered experiments in the harness of slice 04, each with a control and a rival, each allowed to fail:

- **E-move-1, sensing.** Drive one leg's chordotonal neurons as its joints move (position-like drive for claw neurons, velocity-like for hook neurons, where the dataset's types allow the split: claw is mostly `SNpp50`, hook `SNpp39/41`, club `SNpp40/47/60/56/57`, labelled by synonym only in the hind legs). Readout: which interneurons, ascending neurons and brain neurons are recruited, on which side, against a control that drives as many random leg sensory neurons. Campaniform sensilla sense load, and a cartoon leg carries none: they are not driven.
- **E-move-2, commanding.** Activate one descending type at a time and read out which motor pools the wiring recruits. Best first candidate: `MDN` (four neurons, backward walking, works in headless flies). Then `DNa02` (turning), `DNg100` and `DNg97` (walking initiation), `DNp09` (walking, but also freezing), `DNg62` and `DNge078` (antennal grooming). `DNg12` is eight subtypes here and only `DNg12_e` reaches the front legs. `DNb02` is not a leg neuron; skip it.
- **E-move-3, rhythm.** Does tonic `DNg100` drive give 7 to 15 Hz alternation in leg motor pools, as a 2025 preprint reports for the male nerve cord with static weights, through the triplet `IN17A001`, `INXXX466`, `IN16B036` (all present here, six neurons each)? Expected to be fragile. This supersedes branch B3's question.

On a pass, the living view replays the recordings: he walks, and light runs up the cord and into the brain; he is sent backwards by four neurons. On a fail the view keeps Stage A and says what failed.

## What this can never show

Force, balance, contact with the ground, or movement itself: there is no body in the model, and the puppet is the only thing that moves. Gating by state (real flies silence their own movement sensors while they walk; a static wiring diagram cannot, so the hook-neuron drive will be too strong). Neuromodulation. Tiring (choices N15).

## Verification

- The mapping table above is data (`web/src/view/motor.ts`), each row with its confidence and source, and a test refuses a row that names a pool the legs lock does not hold, or that drives `Fe reductor`.
- For a fixed puppet trajectory, the forced spikes of every pool equal `InputLayer` run by hand on the same thresholds. Zero movement, zero spikes, zero light.
- Left and right: a movement of his left front leg lights only neurons whose soma side is left and whose neuromere is T1.
- The card and the legend say "driven by us" wherever forced motor spikes are counted; the audit covers every number.
- **Visual variable: can a newcomer tell which leg is moving from the cord alone?** Crop: the nerve cord during a walk, three frames. Then `screenshot-critique`.
- **Human checkpoint, non-blocking.**

## Must stay green

`make check`. V1's dark-stage test: the brain stays dark in Stage A.

## Sources read in the research pass

Azevedo et al. 2024, Nature (female nerve cord motor neurons); Lesser et al. 2024, Nature (premotor networks); Cheong et al. 2024, eLife (male nerve cord, descending to motor); Feng et al. 2020 (moonwalker circuit, trochanter flexion lifts the femur); Mamiya et al. 2018, 2023 (claw, hook and club neurons); Agrawal et al. 2020; Chen et al. 2023 (ascending neurons); Dallmann et al. 2025 (presynaptic gating during self-movement); Bidaye et al. 2014, 2020; Yang et al. 2024 (DNa02, DNg13); Sapkal et al. 2024 (DNg100, DNg97); Braun et al. 2024; Guo et al. 2022 (DNg12); Hampel et al. 2015 (aDN); Pugliese et al. 2025 preprint (rhythm from static weights). Links are in `assets/evidence/v1/research-2026-09-19.md`. Not everything could be opened; what was read only as an abstract or a search excerpt is marked there.
