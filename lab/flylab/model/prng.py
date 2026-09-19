"""Counter-based random input: threefry2x32 with 20 rounds, read as four 16-bit lanes per call.

A neuron's input train depends only on (seed, bodyId, step). It is the same in
the whole brain, in any subgraph and under any lesion. No float takes part:
a forced spike happens iff ``lane16 < thr16``.
"""

from __future__ import annotations

import numpy as np

MASK = np.uint64(0xFFFFFFFF)
PARITY = np.uint64(0x1BD11BDA)
ROTATIONS = ((13, 15, 26, 6), (17, 29, 16, 24))


def _rotl(x: np.ndarray, bits: int) -> np.ndarray:
    return ((x << np.uint64(bits)) | (x >> np.uint64(32 - bits))) & MASK


def threefry2x32(key: tuple, counter: tuple) -> tuple[np.ndarray, np.ndarray]:
    """``threefry2x32_20(counter, key)`` of Random123. Words are held in uint64 and masked, so nothing overflows."""
    k0, k1 = (np.asarray(k, dtype=np.uint64) & MASK for k in key)
    x0, x1 = (np.asarray(c, dtype=np.uint64) & MASK for c in counter)
    ks = (k0, k1, k0 ^ k1 ^ PARITY)
    x0, x1 = (x0 + ks[0]) & MASK, (x1 + ks[1]) & MASK
    for injection in range(1, 6):
        for bits in ROTATIONS[(injection - 1) % 2]:
            x0 = (x0 + x1) & MASK
            x1 = _rotl(x1, bits) ^ x0
        x0 = (x0 + ks[injection % 3]) & MASK
        x1 = (x1 + ks[(injection + 1) % 3] + np.uint64(injection)) & MASK
    return x0, x1


def lane16(seed: int, body_id, step) -> np.ndarray:
    """The 16-bit value that decides a forced spike. ``body_id`` and ``step`` broadcast."""
    body = np.asarray(body_id, dtype=np.uint64)
    step = np.asarray(step, dtype=np.uint64)
    w0, w1 = threefry2x32(key=(np.uint64(seed), step // np.uint64(4)), counter=(body & MASK, body >> np.uint64(32)))
    lanes = np.stack([w0 & np.uint64(0xFFFF), w0 >> np.uint64(16), w1 & np.uint64(0xFFFF), w1 >> np.uint64(16)])
    lane = np.broadcast_to(step % np.uint64(4), lanes.shape[1:]).astype(np.intp)
    return np.take_along_axis(lanes, lane[None, ...], axis=0)[0].astype(np.uint16)
