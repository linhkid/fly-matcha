// The browser's reading of contracts/codec/taste.codec.json: lookups only.
// Held to contracts/fixtures/codec, like the Python reading in lab/flylab/codec/build.py.

export interface Level { label: string; hz: number; thr16: number }
export interface Tea { id: string; maker: string; blend: string; tier: string; notes: string }
export interface Codec {
  id: string;
  channels: { id: string; group: string; tag: string; levels: Level[] }[];
  menu: { tag: string; note: string; maxScoops: number; tiers: Record<string, number[]>; teas: Tea[] };
}

export interface SipLevels { sweet: number; bitter: number; sweetThr16: number; bitterThr16: number }

export class CodecError extends Error {}

function channel(codec: Codec, id: string): Level[] {
  const found = codec.channels.find((c) => c.id === id);
  if (!found) throw new CodecError(`no ${id} channel`);
  return found.levels;
}

export function bitterLevel(codec: Codec, teaId: string, scoops: number): number {
  const tea = codec.menu.teas.find((t) => t.id === teaId);
  if (!tea || !Number.isInteger(scoops) || scoops < 0 || scoops > codec.menu.maxScoops) {
    throw new CodecError(`no such sip: ${teaId}, ${scoops} scoops`);
  }
  return scoops === 0 ? 0 : codec.menu.tiers[tea.tier][scoops - 1];
}

export function sipLevels(codec: Codec, teaId: string, scoops: number, sweets: number): SipLevels {
  const sweetLevels = channel(codec, "sweet");
  const bitterLevels = channel(codec, "bitter");
  if (!Number.isInteger(sweets) || sweets < 0 || sweets >= sweetLevels.length) throw new CodecError(`no such sweet level: ${sweets}`);
  const bitter = bitterLevel(codec, teaId, scoops);
  return { sweet: sweets, bitter, sweetThr16: sweetLevels[sweets].thr16, bitterThr16: bitterLevels[bitter].thr16 };
}

export function levelHz(codec: Codec, channelId: string, level: number): number {
  return channel(codec, channelId)[level].hz;
}
