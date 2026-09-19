# Evidence for slice 03, the full graph

Accepted 2026-09-19. The user approved the 508 MB download in this session ("yes pls download it").

| Check of the slice | Result |
|---|---|
| The download survives a stall | `lab/tests/test_fetch.py`: a cut connection is resumed from where it stopped with the object's generation pinned; a partial file from an earlier run is continued; a server that ignores ranges is fine; a wrong partial file and a changed object are thrown away; a server that never answers keeps the partial file. The real download's first header request was dropped by the server; it got a retry and the file then arrived in one run |
| The file is what the server declared | 508,025,642 bytes, MD5 as declared, sha256 `9b3beab17bad5f61…` in `data/raw/sources.json` |
| At least 160,000 neurons | **164,506**, exactly the number FlyBrain built with the same filters |
| Sign coverage at least 95% | **98.1%** (FlyBrain measured 98.1%) |
| `GNG015`, `GNG095`, `DNge062` among MN9's top inputs | first, second and fourth of ten: `graph-info.txt` |
| Every bound taste neuron has an out-edge | none of the 134 sweet, bitter, water, Ir94e and high-salt neurons is silent. Ten others are: 2 unassigned labellar, 2 leg sweet, 6 leg pheromone. FlyBrain's photoreceptor problem does not reach the mouth |
| The reader refuses a truncated file, a misaligned section, an unsorted row, `synthetic: true` | `lab/tests/test_graph_format.py`, also: trailing bytes, a wrong magic, another version, a missing manifest, a file that does not match its manifest's hash |
| `synCount <= 65535`, 64-bit body IDs | the build refuses a larger count; the golden file holds IDs above 2^32 and at 2^40 |
| Building twice gives the same SHA-256 | `e44513e148808b0d6fdf0198ebdfe04f8fb3783e52fef5bb178d75d6aec38ae4`, twice |
| Duplicate pairs in the weights file | **none**: 25,563,197 rows, each pair once. 18,981,831 pairs fall under 5 synapses; 31 self-edges dropped; 47,071 untyped bodies left out |
| `make check` | green |

## What binding by connectivity found

Counted in the graph, never named: the ten types that receive most from his sweet taste neurons include `GNG175`, `GNG232` and `ANXXX462a`, which are the relays the literature calls Usnea, G2N-1 and Clavicle. `GNG120`, Roundtree, is the third strongest input to MN9. MN9 is two synapses from a taste neuron. The census page lists every hub with its counts.

## A pilot, not an experiment

Three hundred milliseconds of his time, seed 1, base model, whole brain, about three seconds each to compute:

| Sip | MN9 spikes | Neurons that fired |
|---|---|---|
| sweet 4 | **24** | 2,043 |
| bitter 4 | 0 | 3,903 |
| sweet 4 and bitter 4 | **0** | 3,897 |
| sweet 2 | 0 | 3,489 |

Sweet reaches the motor neuron that lifts his proboscis, and bitter stops it, on his own wiring, as published for the female brain. This is one seed and no control: it is what slice 05 exists to test properly, and nothing may be tuned because of it. One thing to look at there and not explain away here: the weaker sweet sip recruited more neurons than the stronger one.
