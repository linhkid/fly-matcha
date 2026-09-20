// Reader of data/built/web/brain.cloud, written by lab/flylab/web/cloud.py (slice V1).
// "FSKCLOUD" | u32 version | u32 n | u64 bodyId[n] | f32 xyz[3n] | u8 group[n], little-endian, sections on 8-byte boundaries.

export interface Cloud {
  n: number;
  bodyId: BigUint64Array;
  xyz: Float32Array;
  group: Uint8Array;
}

export interface Mouthpart { bodyId: string; group: "grn.sweet" | "grn.bitter"; side: "L" | "R" | "unknown"; speaks: boolean }

export interface CloudInfo {
  version: number;
  dataset: string;
  typedNeurons: number;
  points: number;
  groups: { code: number; id: string; points: number }[];
  mouthparts: Mouthpart[];
  note: string;
}

// Along the dataset's long axis: in front of this is brain, behind it nerve cord. The cut is ours, made by eye on the cloud.
const CORD_FROM = -0.12;
export const inCord = (cloud: Cloud, point: number): boolean => cloud.xyz[3 * point + 2] > CORD_FROM;

const pad8 = (bytes: number): number => Math.ceil(bytes / 8) * 8;

export function readCloud(buffer: ArrayBuffer): Cloud {
  const magic = new TextDecoder().decode(new Uint8Array(buffer, 0, 8));
  if (magic !== "FSKCLOUD") throw new Error("not a brain cloud");
  const header = new DataView(buffer, 8, 8);
  const version = header.getUint32(0, true);
  const n = header.getUint32(4, true);
  if (version !== 1) throw new Error(`brain cloud version ${version} is not supported`);
  const xyzAt = 16 + pad8(8 * n);
  const groupAt = xyzAt + pad8(12 * n);
  if (buffer.byteLength !== groupAt + pad8(n)) throw new Error("brain cloud is truncated or has trailing bytes");
  return {
    n,
    bodyId: new BigUint64Array(buffer, 16, n),
    xyz: new Float32Array(buffer, xyzAt, 3 * n),
    group: new Uint8Array(buffer, groupAt, n),
  };
}
