# The tea menu

The tiers are this project's guess from those notes, and nothing here is a measurement or a claim about any product. The names belong to their makers, and the project is not affiliated with any of them.

| Maker | Blend | The user's notes | Tier |
|---|---|---|---|
| Ippodo Tea | Kannoshiro | Vibrant, smooth, high-grade ceremonial; for traditional preparation | smooth |
| Hoshino Seichaen | Hoshiju | From Yame in Fukuoka; intense nuttiness and savoury depth | smooth |
| Marukyu Koyamaen | Isuzu | Popular, high quality; used both for drinking and for cooking | balanced |
| Marukyu Koyamaen | Aoarashi | As Isuzu; a favourite among travellers | balanced |
| Yamamasa Koyamaen | Ogurayama | Affordable, well-balanced everyday blend; subtle umami, dark chocolate or nutty notes | balanced |
| Nakamura Tokichi | house matcha | A long-established Kyoto producer; rich aroma, stone-ground | balanced |
| A culinary grade from Taiwan | unnamed | Harvested later in the year; more robust and slightly bitter; for lattes, ice cream, baking | robust |


## What a fly can and cannot taste of this

The model has one thing to say about a tea: how hard it drives the bitter taste neurons. Caffeine and the related compounds in tea are real bitter stimuli for a fly. Umami, aroma, nuttiness and colour are not in the circuit, so two teas of the same tier are the same tea to him. The menu says so rather than pretending otherwise.

## How the menu becomes spikes

A tea names a tier. A tier and a number of scoops give one of the codec's five bitter levels. Nothing else changes: the levels, the rates behind them and the envelope stay exactly as slice 05 and slice 07 define them, so the menu adds no trial that was not already verified.

| Tier | 1 scoop | 2 scoops | 3 scoops |
|---|---|---|---|
| smooth | level 1 | level 2 | level 3 |
| balanced | level 2 | level 3 | level 4 |
| robust | level 3 | level 4 | level 4 |

Two tags apply, and the interface shows both. Which tier a tea belongs to is `staged`: it was authored from tasting notes. What a level does to the taste neurons is `model`.

## Where it lands

- **Slice 05** writes the menu into the codec, through the codec's one writer, as a `menu` block: teas with their tier, and the tier table above. A test checks that every cell of the table is one of the five levels.
- **Slice 09** lets the player pick a tea and a number of scoops instead of a raw bitter level. The raw level stays visible beside it.
- **Slice 11** can ask a question the menu makes natural: which is the most robust tea he will still drink with two sweets?
- **Slice 12** shows the menu in the tea room.
