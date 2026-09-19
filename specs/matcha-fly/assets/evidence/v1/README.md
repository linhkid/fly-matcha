# Evidence for slice V1, the living view, unlit

Accepted 2026-09-19 by the agent that built it. The human checkpoint is open: see the end.

## What was checked, and how

| Check of the slice | Result |
|---|---|
| `light()` gives zeros for no recording and for a recording with no spikes | `web/tests/view.test.ts`, "the dark stage". The page calls `light()` for the cloud and for his lips, once, and gets zeros |
| The cloud file regenerates byte for byte, its body IDs are in the lock's universe, its groups exist in the lock | `lab/tests/test_cloud.py` |
| The loop under a fake clock: six phases forever, pause, resume, stills, phase lengths that differ per sip | `view.test.ts`, "the endless loop", "a loop whose tasting takes its time", "holding one moment" |
| The card with no recording claims nothing, in 25 sips × 6 phases, at work and on a break | `view.test.ts`, `hud.test.ts` |
| The menu resolves every tea and scoop count to a level, in Python and in TypeScript alike; the rotation visits all 25 sips | `lab/tests/test_codec.py`, `view.test.ts` against `contracts/fixtures/codec/` (140 sips) |
| Every number on the page is tagged | `hud.test.ts`: `audit()` over all HUD markup, every phase of every sip. It also runs on the live page in development |
| The poses cannot lie: proboscis at zero, cup full and sweets in place while he tastes, no jumps, a break only puts things down | `web/tests/puppet.test.ts` |
| Import boundaries and banned calls | `web/tests/boundaries.test.ts` |
| The browser's first engine files agree with the oracle | `web/tests/engine.test.ts`: the three published threefry answers, every lane of the fixture, and the forced spikes of all 21 driven fixtures. Green on the first run |
| The card reports live spikes in the right tense and claims nothing behind his lips | `hud.test.ts` |
| His lips are lit only while the ceremony's clock runs inside the touch window; sweet and bitter levels drive their own neurons; the seed is the bowl's index; frame by frame equals all at once | `web/tests/live.test.ts` |
| The browser reads the lab's cloud exactly, including the padding after an odd number of points | `contracts/fixtures/cloud/tiny.cloud`, checked from both sides |
| `make check` | 105 Python tests, 54 web tests, the type check, the data guard: green |

## The shots

`frame-taste.jpg` (the tea on his lips, the magnified lips open, spikes counted on the card), `frame-break.jpg`, `frame-staged.jpg` and `frame-bare.jpg` (text hidden) are whole frames at 1440 × 900. `phases.jpg` is the tea table cropped from a still of every phase and of the break. `fly-views.jpg` is the fly from the side, from above and from the front.

They were not taken by hand in the browser pane, as the slice first said, and not by Playwright, which nobody approved. The pane throttles a hidden tab, so an endless animation cannot be judged through it. The page opens as a still from its address (`?sip=3&phase=taste&at=0.5`, with `&break=1`, `&staged=1`, `&bare=1`, `&open=card,lips`, `&from=x,y,z&at3=x,y,z`), and the shots were taken by the Chrome already installed on the machine, run headless with a throwaway profile in the session's scratch folder. Nothing was downloaded. Rendering was by software (SwiftShader), so a real GPU may show slightly different edges. A still of the taste phase is repeatable down to the spikes: how far the trial has run is a function of the ceremony's clock.

## What looking at them changed

The shots earned their keep. Each of these was found by eye and fixed before acceptance:

1. **A verdict nobody computed.** The first staging drained the cup and removed the sweets while he tasted. That is a drinking fly, and no model had said so. Poses moved into a pure file with tests that hold the cup full.
2. The HUD panels covered the fly and half the table. The panels became a low strip, and the camera was lowered.
3. The tins stood behind him, so the chosen tin lifted out of sight. Everything he uses now stands in front of his walking line.
4. His head dipped through the bottom of the cup, and the row of lip dots showed through the bowl like a rendering fault. The taste pose became a step forward and a small nod that ends with his lips on the surface; he walks further back; the lobes are smaller.
5. The kettle and the tilted bowl hid his face. Both now work beside him, and the kettle has a stream.
6. A black fly on a black ground could not be read. A paper screen stands behind the table.
7. With "What is staged here?" on, the whole floor glowed amber. The room is now tinted lightly and the props and the fly strongly.
8. A still opened with the fly still walking from the tins and the cloud turned edge-on. Stills now open settled.

## Fresh eyes

A reviewer that had not seen the work judged the first accepted shots against the slice's one visual variable, *is it legible what is fly, what is brain, and what is taste neuron?*, and found it half failed:

- **Fly:** legible at once. **Brain:** only half; the page never called the cloud a brain, nothing tied it to him, and the card covered the nerve cord. **Taste neurons:** failed; one or two pixels, hidden inside the cup while he tasted, no link from the magnified panel to his mouth, and the same pink as "reward dopamine".
- Things that read as activity without being it: large square points in saturated colours ("sparks"), two orange relays in the cord ("glowing eyes"), and rates in the present tense while nothing touched his lips.
- Things that implied a decision: "sip 3", a cup that emptied by itself, sweets that vanished, a proboscis inside the cup, and the footnote "the decision is not [puppetry]".

What was done: names pinned in the scene to his brain, his nerve cord and his lips; a thread from his head to the cloud; a leader from the magnified lips to his mouth; round, matte, smaller points, and the cord drawn denser; a glass cup, so his lips and the level of the tea can be seen; lip dots that are dim until the model fires them; "bowl" for "sip"; the cup visibly tipped out and the sweets visibly carried off; tenses on the card; and a footnote that says no decision has been computed. The staged tint became lilac, the colour of its tag, not the amber of the model's.

A second reviewer, for the code, could not run that day: the account's spending limit was reached.

## The review that was owed, and a second look at the crockery

Done later the same day as one workflow of 22 agents: three researchers, one visual critic, three code reviewers, and an adversarial verifier for each of fifteen findings. Fourteen were confirmed and fixed, one refuted; choices K12 lists them. The worst: for about a second and a half after every break his taste neurons fired while he was still walking back, because "lips on the tea" had two owners. The research reports are in `research-2026-09-19.md`.

The critic of the new bowl and glass found the glass reading as milk (a green skin on a white body), the glaze streaks as woodgrain, the whisk as a plunger, and his face hiding his lips at the cup. Fixed: the glass holds a solid green body a little over half way up, the streaks are short and uneven, the whisk has tines and a bound waist, and he comes to the cup at an angle (`crockery.jpg`, `phases.jpg`).

One bug was found by looking and by nothing else: a shot in which he stood beside the cup. A frame's first timestamp can lie before the clock read a moment earlier; the negative time step turned him by a rate times a negative time.

## Open: the human checkpoint

Does it feel like a place? Non-blocking. The user has the page and the shots.
