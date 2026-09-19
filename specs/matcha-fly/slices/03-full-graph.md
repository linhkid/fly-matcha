# 03 · Full graph

**Question:** does the whole connectome load into one facts-only format, with the anchors we expect?

Needs slice 01.

## Contract

Delivers the whole-brain graph as a `.fskg` file with its manifest, a reader in Python, and the connectivity-defined groups the taste circuit needs.

Does not deliver the browser reader (08) or any subgraph (07).

## Steps

1. **Consent, stage B.** Print and ask: `connectome-weights-male-cns-v1.0-minconf-0.5-traced-only.feather`, 508 MB by the server's headers, same bucket. The traced-only file omits untraced fragments that are not neurons and is half the size of the full one. The server declares an MD5 for it, so `flylab data fetch --stage B` can verify it as it stands. Before running it, make the download survive a stall: today one stalled read discards the partial file and the next run starts from zero, which was fine for 58 MB and is not for 508. Add progress output, and retry or resume.
2. **Build** by the rules in the graph section of CONTRACTS.md: typed bodies, duplicate pairs summed, the 5-synapse threshold, self-edges dropped and counted, transmitter codes from `consensus_nt`. Report whether the file had duplicate pairs at all. Ignore the weights file's `type_pre` and `type_post` columns. Type names have one owner, the annotation file.
3. **Bind by connectivity.** The census module gains a second evidence kind, `connectivity`, and adds to `taste.lock.json`: `hub.mn9.in` (the 20 types with most synapses onto MN9), and `hub.grn.out.<population>` (the 10 types receiving most synapses from each taste population). These are found by counting synapses, never by literature nickname. It also writes `hopDepth` for every type it binds: the shortest path in synapses from any bound taste neuron. The lock is the only owner of that number; the atlas and the circuit scope read it.

## Carried over from slice 02

The lock stores counts per side, but a trial can drive the left or the right members of a group, so `resolve` must return a side letter for every neuron: `{groupId: {indices, sides}}`, as `contracts/TRIAL.md` defines. Extend the lock with each body's side, written by the census, and rebuild `circuits/taste.lock.json`. The graph type already exists: `flylab.graph.Graph`, with `from_edges` for tests. This slice adds the file format around it and must return that same type.

## Seam

```
flylab.graph.format:   write_graph(path, arrays, manifest)     read_graph(path) -> Graph   (np.frombuffer, zero copy)
flylab.graph.build:    build_full(raw_dir) -> Graph
flylab.census:         bind_connectivity(lock, graph) -> Lock
resolve(lock, graph) -> {groupId: indices}     fails loudly on a body that is absent from the graph
```

`contracts/GRAPH.md` is written here from the layout in CONTRACTS.md, with a tiny golden file `contracts/fixtures/graph/tiny.fskg`. When this slice is accepted, replace the graph section of the spec's CONTRACTS.md with a pointer to it.

## What the human sees

`python -m flylab graph info data/built/full/malecns.fskg` prints neurons, edges, the transmitter histogram, sign coverage, how many bodies were dropped as untyped, and the top ten inputs to MN9 with synapse counts and transmitters.

## Verification

- At least 160,000 neurons. FlyBrain built 164,506 with the same filters.
- Sign coverage at least 95%, meaning the share of neurons whose transmitter maps to a non-zero sign under the base policy. FlyBrain measured 98.1%.
- `GNG015`, `GNG095` and `DNge062` appear among MN9's top inputs, as seen on the explorer.
- Every bound taste neuron has at least one outgoing edge. FlyBrain found 1,989 of 3,377 photoreceptors were fragments with no output; taste afferents may have the same problem, and the report says how many.
- The reader rejects a truncated file, a misaligned section, an unsorted row and `synthetic:true`.
- The build asserts `synCount <= 65535`. Body IDs are stored as 64-bit and never assumed to fit in 32.
- Building twice gives the same SHA-256.

## Delegated

Memory strategy for the 500 MB table, caching, CLI flags.

## Must stay green

`make check`. Slice 02's fixtures unchanged. Nothing under `data/built/full/` is tracked.

## Feedback that would change this slice

The user prefers the full 1.05 GB weights file, or a different synapse threshold. Either is recorded in the manifest and is an artifact version: every later verdict names the graph hash it was run on.
