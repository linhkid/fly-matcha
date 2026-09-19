# fly-sim-k

**Matcha Fly.** Host a tea ceremony for one simulated male fruit fly. Each sip is tasted by a spiking model running on his real wiring, the MaleCNS v1.0 connectome, and you can open the brain, bet on what a cell type does, silence it and find out. A Python lab runs the same model on the whole connectome, with controls, and is the only place where a game mechanic can earn the right to ship.

The plan, the rules and the current status live in [specs/matcha-fly/README.md](specs/matcha-fly/README.md). Start there.

## Run what exists

```sh
make venv                                        # installs pinned packages from PyPI: ask before downloading
.venv/bin/python -m flylab data plan --stage A   # what would be fetched, from response headers only
.venv/bin/python -m flylab data fetch --stage A --yes
.venv/bin/python -m flylab census taste          # writes circuits/taste.lock.json and circuits/taste.census.html
make check
```

## Layout

- `lab/flylab/` the Python lab: data with provenance, the census, later the graph, the reference model and the experiments.
- `circuits/` which neurons play which role, as data, with the evidence for each binding.
- `data/raw/` source files. Never committed.
- `specs/matcha-fly/` the plan, its contracts and the evidence each slice was accepted on.

## Data and credit

The connectome is MaleCNS v1.0 by the FlyEM Project Team at HHMI Janelia, the Drosophila Connectomics Group at Cambridge and Google Research, licensed CC-BY 4.0. Connectivity is real. Signs, weights, doses and behaviour are models, and the project says so wherever they appear. This is an experiment with biological structure, not a validated digital fly.
