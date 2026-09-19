# Fly brews Matcha?

**Matcha Fly.** Host a tea ceremony for one simulated male fruit fly. Each sip is tasted by a spiking model running on his real wiring, the MaleCNS v1.0 connectome, and you can open the brain, bet on what a cell type does, silence it and find out. A Python lab runs the same model on the whole connectome, with controls, and is the only place where a game mechanic can earn the right to ship.

The plan, the rules and the current status live in [specs/matcha-fly/README.md](specs/matcha-fly/README.md). Start there.

## Run what exists

```sh
make venv                                        # installs pinned packages from PyPI: ask before downloading
.venv/bin/python -m flylab data plan --stage A   # what would be fetched, from response headers only
.venv/bin/python -m flylab data fetch --stage A --yes
.venv/bin/python -m flylab census taste          # writes circuits/taste.lock.json and circuits/taste.census.html
.venv/bin/python -m flylab data fetch --stage B --yes   # 508 MB of wiring: ask before downloading
.venv/bin/python -m flylab graph build           # the whole brain as one file, under data/built/full/ (never committed)
.venv/bin/python -m flylab web recordings        # his brain's response to each of the 25 sips, for the page to replay
make check
```

## Watch him brew

```sh
make web     # installs the page's packages from npm: ask before downloading
make dev     # then open http://localhost:5173
```

He selects a tea, sifts, brews, pours, tastes and cleans up, forever, beside the cloud of his 138,556 placed neurons. When the tea touches his lips, light runs through the cloud: every flash is a spike from a recording of his whole brain tasting that sip, 164,506 neurons on their real wiring, slowed fifty times. He stays with the cup until the motor neuron that lifts his proboscis has fallen silent. These are pilot recordings: what was measured, not yet a verdict, so he does not drink yet. **Take a break** (or the space bar) holds the ceremony: he goes to his cushion and reads Dostoevsky until you send him back. Every panel folds, and **H** hides all text. **What is staged here?** tints everything that is puppetry. `?sip=3&phase=taste&at=0.5` opens the page as a still of one moment.

## Layout

- `lab/flylab/` the Python lab: data with provenance, the census, later the graph, the reference model and the experiments.
- `web/` the page: a three.js scene, the endless ceremony, and the honesty tags. Pure modules with tests; `scene.ts` is the only file that knows three.js.
- `contracts/` what both languages must agree on: the neuron model, trials, the codec and the fixtures that bind them.
- `circuits/` which neurons play which role, as data, with the evidence for each binding: the taste circuit, and the motor pools of his six legs.
- `data/raw/` source files. Never committed.
- `specs/matcha-fly/` the plan, its contracts and the evidence each slice was accepted on.

## Data and credit

The connectome is MaleCNS v1.0 by the FlyEM Project Team at HHMI Janelia, the Drosophila Connectomics Group at Cambridge and Google Research, licensed CC-BY 4.0. Connectivity is real. Signs, weights, doses and behaviour are models, and the project says so wherever they appear. This is an experiment with biological structure, not a validated digital fly.
