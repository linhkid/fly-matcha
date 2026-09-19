# B5 · Learn the aroma

**Question:** if the smell of matcha is paired with sugar, does the mushroom body's vote shift toward approach, and does a control without plasticity fail to show it?

Needs slice 05. Time box: three days, lab only. **Expected to be weak.** Blocks nothing.

## What is already known

FlyBrain built this on the same dataset. It found 4,064 Kenyon cells, 97 output neurons and 16 PPL1 dopamine neurons. Kenyon cells were active 49% of the time until a hand-set bias of −3.0 was added; in a fly an odour lights 5–10%. Paired conditioning moved the output balance from +4.9 to +80.8. Then the control killed it: in actual play the fly without plasticity behaved the same. Punishment had no lever at all: "it only knows how to embolden."

Learning also needs a rule for changing synapses, which the model in `contracts/MODEL.md` does not have, and dopamine carries no sign in the graph. Anything here is an addition to the model and must be versioned as one.

## Contract

Experiment `E07-aroma`. Pre-checks first, from slice 05's free measurements: does sugar recruit PAM neurons at all, and how sparse are Kenyon cells under an odour without any bias? If Kenyon cells are not sparse without a hand-set bias, stop there and write it up. A bias would be a second free parameter in a model whose virtue is having one.

Otherwise: odour A with reward, odour B unpaired, and a run with plasticity switched off.

**Pre-written pass:** the output balance flips for A and not for B in 80% of seeds, and does not flip in the control.

## Either way

This branch never reaches the browser in v1. A pass is a lab result and a journal page. A fail is a "Didn't work" page. The tea room never shows a learning curve that no passing experiment stands behind.
