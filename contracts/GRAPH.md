# The graph file, `.fskg` version 1

The one format in which the connectome reaches a simulator, in the lab and in the browser. Owner of the bytes: `lab/flylab/graph/format.py`. Owner of what goes in: `lab/flylab/graph/build.py`. Golden file: `contracts/fixtures/graph/tiny.fskg`, with what a reader must get from it in `tiny.fskg.expected.json`. Both readers are held to it.

## What it holds

Facts only: which neurons, which transmitter the dataset gives each, and how many synapses one makes onto another. No floats, no signs, no weights, no group names. Sign policy and weight scale belong to the model (`contracts/MODEL.md`), so flipping glutamate is a model variant and not a new file. Groups live in the circuit lock.

## Layout

Little-endian. Every section starts on an 8-byte boundary and is padded to the next one with zero bytes.

```
char[8]  "FSKGRAPH"
u32      version = 1
u32      N            neurons
u32      E            edges
u32      minSynapses  the edge threshold used when the file was built
u64[N]   bodyId       strictly ascending; a neuron's index is its rank
u8[N]    nt           0 unknown 1 acetylcholine 2 GABA 3 glutamate 4 histamine 5 dopamine 6 octopamine 7 serotonin
u8[N]    flags        bit 0 = sentinel (simulated, out-edges omitted); every other bit is zero
u32[N+1] outOffset    rows are PRESYNAPTIC: neuron i's out-edges are target[outOffset[i] : outOffset[i+1]]
u32[E]   target       strictly ascending within a row
u16[E]   synCount     at least 1, at most 65535
```

The header is 24 bytes. A body ID is 64 bits and is never assumed to fit in 32: the golden file holds one above 2^32 and one at 2^40.

## What a reader must refuse

By name, before handing anything to a simulator: a wrong magic; a version other than 1; a file shorter than its header or than any of its sections (*truncated*); padding that is not zero, or a section that does not end on its boundary (*misaligned*); bytes after the last section (*trailing*); body IDs that do not strictly ascend; targets that do not strictly ascend within a row; an `outOffset` that does not run from 0 to E without decreasing; a target of N or more; a synapse count of zero; a transmitter code above 7; an unknown flag bit; a sentinel with out-edges.

## The manifest

`<name>.manifest.json` beside `<name>.fskg`:

```
{ kind: "full" | "subgraph",
  dataset: { name, version, license, attribution },
  sources: [ { file, sha256, bytes } ],
  graph:   { file, sha256, N, E, minSynapses },
  filters: { weightsRows, rowsBetweenTyped, droppedUntypedBodies, summedDuplicatePairs, droppedSelfEdges, droppedBelowThreshold },
           rowsBetweenTyped - summedDuplicatePairs - droppedSelfEdges - droppedBelowThreshold = E.
           summedDuplicatePairs counts rows merged into an earlier row of the same pair; droppedSelfEdges counts every
           self-edge whatever its size; droppedBelowThreshold counts only the pairs between two different neurons.
  counts:  { ntHistogram, unknownNt, signCoverage },
  parent?: { graphSha256 },  extraction?: { ... },          subgraphs only, slice 07
  exporter: { gitRev, sourceSha256: { build.py, format.py, graph.py } },
  synthetic: false }
```

A reader loads a file only if the manifest is there, says `synthetic: false`, and names the file's SHA-256. Tests may pass a flag to load a synthetic one. Every verdict of every experiment names the graph hash it ran on.

## How the full graph is built

From three files of MaleCNS v1.0: the body annotations, the body transmitters, and the traced-only connection weights.

1. **Neurons** are the bodies with a non-null `type` in the annotation table. The weights file's own `type_pre` and `type_post` columns are ignored: type names have one owner.
2. **Transmitter** is `consensus_nt`, lower-cased, matched against the seven names above. Anything else, including `unclear`, is 0.
3. **Edges.** Keep the rows whose two bodies are both neurons. If a pair appears in more than one row, sum the rows first. Then keep pairs with at least `minSynapses` synapses (5). Drop self-edges, which in electron microscopy are mostly segmentation artefacts. Every one of these steps is counted in the manifest.
4. The build refuses a synapse count above 65535 and gives the same bytes, and so the same SHA-256, every time it runs on the same sources.
