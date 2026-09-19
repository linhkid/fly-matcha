"""flylab: the Python lab for fly-matcha.

Everything that touches the connectome starts here: fetching the source files,
binding circuit roles to body IDs (the census), and, in later slices, the graph,
the reference neuron model and the experiments.
"""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = REPO_ROOT / "data" / "raw"
CIRCUITS_DIR = REPO_ROOT / "circuits"
