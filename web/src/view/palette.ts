// Colours and plain words for the groups on screen. Who belongs to a group comes from the census lock.
// The colours and the words are ours. They are flat, matte colours on purpose: brightness is reserved for spikes.

export const GROUP_COLOUR: Record<string, string> = {
  none: "#4b5346",
  mn9: "#e0c95c",
  "relay.shiu2022": "#d98f4a",
  "mn.proboscis.other": "#a89a5a",
  "dn.adn": "#5fb9bf",
  "dn.dng12": "#3f8fa6",
  "mb.mbon": "#a883c9",
  "mb.pam": "#c9739b",
  "mb.ppl1": "#b04d68",
  "mb.kc": "#6f58ad",
  "grn.sweet": "#d98aa3",
  "grn.bitter": "#86b35a",
};

export const GROUP_WORDS: Record<string, string> = {
  none: "every other neuron",
  mn9: "MN9, the pair that lifts his proboscis",
  "relay.shiu2022": "named relays between tongue and muscle",
  "mn.proboscis.other": "the other muscles of drinking",
  "dn.adn": "antennal grooming command neurons",
  "dn.dng12": "candidate grooming neurons, by name only",
  "mb.mbon": "mushroom body outputs",
  "mb.pam": "reward dopamine",
  "mb.ppl1": "punishment dopamine",
  "mb.kc": "Kenyon cells, the odour code",
};

export const hex = (colour: string): number => parseInt(colour.slice(1), 16);
