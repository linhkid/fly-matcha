"""``python -m flylab model check``: three pictures that show the oracle is the published neuron.

A report for a person, not a gate. The gates are the exact-equality fixtures and tests.
"""

from __future__ import annotations

import base64
import io
import math
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

from flylab.graph import from_edges  # noqa: E402
from flylab.model import oracle  # noqa: E402
from flylab.model.fixtures import ALWAYS, STRONG  # noqa: E402
from flylab.model.spec import Model, load_model  # noqa: E402

ACH = "acetylcholine"
DT, TAU_M, TAU_S = 0.1, 20.0, 5.0
INK, ACCENT, MUTED = "#22261d", "#55792a", "#9a9f8f"


def _png(figure) -> str:
    buffer = io.BytesIO()
    figure.savefig(buffer, format="png", dpi=140, bbox_inches="tight")
    plt.close(figure)
    return base64.b64encode(buffer.getvalue()).decode()


def psp_figure(model: Model) -> tuple[str, float]:
    sim = oracle.Sim(from_edges({10: ACH, 20: ACH}, [(10, 20, 8)]), model, 1).drive([0], ALWAYS, 0, 1)
    trace = []
    for _ in range(1200):
        sim.step(1)
        trace.append(sim.v[1])
    t = np.arange(1, 1201) * DT
    since = np.clip(t - model.delay_steps * DT, 0, None)
    analytic = model.w_syn * 8 * (TAU_S / (TAU_M - TAU_S)) * (np.exp(-since / TAU_M) - np.exp(-since / TAU_S))
    worst = float(np.max(np.abs(np.array(trace) - analytic)))
    figure, axis = plt.subplots(figsize=(7, 3.2))
    axis.plot(t, analytic, color=MUTED, linewidth=5, label="analytic")
    axis.plot(t, trace, color=ACCENT, linewidth=1.4, label="oracle")
    axis.axvline(model.delay_steps * DT, color=INK, linewidth=0.8, linestyle=":")
    axis.set(xlabel="ms after the presynaptic spike", ylabel="potential above rest, mV")
    axis.legend(frameon=False)
    return _png(figure), worst


def rate_figure(model: Model) -> str:
    inputs = 200
    graph = from_edges({**{i: ACH for i in range(1, inputs + 1)}, 1000: ACH}, [(i, 1000, 1) for i in range(1, inputs + 1)])
    rates = [5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200]
    measured = []
    for rate in rates:
        sim = oracle.Sim(graph, model, 1).drive(list(range(inputs)), math.floor(rate * DT * 65.536), 0, 20000)
        step, index = sim.step(20000)
        measured.append(int((index == inputs).sum()) / 2.0)
    drive = np.linspace(1, 200, 400)
    mean_input = model.w_syn * inputs * drive * TAU_S / 1000.0          # mean of g, in mV
    with np.errstate(divide="ignore", invalid="ignore"):
        period = model.refrac_steps * DT + TAU_M * np.log(mean_input / (mean_input - model.v_th))
    constant_drive = np.where(mean_input > model.v_th, 1000.0 / period, 0.0)
    figure, axis = plt.subplots(figsize=(7, 3.2))
    axis.plot(drive, constant_drive, color=MUTED, linewidth=2, label="textbook neuron, constant input")
    axis.plot(rates, measured, "o-", color=ACCENT, markersize=4, label="oracle, 200 Poisson inputs")
    axis.set(xlabel="rate of each input neuron, Hz", ylabel="output rate, Hz")
    axis.legend(frameon=False)
    return _png(figure)


def freeze_figure(model: Model) -> str:
    graph = from_edges({10: ACH, 11: ACH, 20: ACH}, [(10, 20, STRONG), (11, 20, 8)])
    sim = oracle.Sim(graph, model, 1).drive([0], ALWAYS, 0, 1).drive([1], ALWAYS, 10, 11)
    v, g = [], []
    for _ in range(90):
        sim.step(1)
        v.append(sim.v[2]), g.append(sim.g[2])
    t = np.arange(90)
    figure, axis = plt.subplots(figsize=(7, 3.2))
    axis.axvspan(18.5, 40.5, color=MUTED, alpha=0.25, label="refractory, 22 steps")
    axis.step(t, g, where="mid", color=INK, linewidth=1.2, label="g")
    axis.step(t, np.array(v) * 5, where="mid", color=ACCENT, linewidth=1.4, label="v, times 5")
    axis.set(xlabel="step", ylabel="mV", ylim=(-0.2, 3.2))
    axis.legend(frameon=False, loc="upper right")
    return _png(figure)


def write_report(directory: Path) -> Path:
    model = load_model()
    psp, worst = psp_figure(model)
    sections = [
        ("One spike, one synapse", psp,
         f"A presynaptic spike reaches its target {model.delay_steps} steps later, never sooner. From then on the oracle follows the "
         f"analytic potential of the published model; the largest difference over 120 ms is {worst:.1e} mV. The oracle integrates exactly, "
         "with the three constants frozen in the model file, so this is rounding and nothing else."),
        ("Output rate against input rate, beside a textbook neuron", rate_figure(model),
         "200 input neurons, one synapse each, all firing at the rate on the x axis. This model has no constant input to give a neuron, "
         "so there is no exact curve to lay under it. The grey curve is only a landmark: the textbook leaky neuron under constant input of "
         "the same mean. The oracle is expected to miss it, and the way it misses is informative. It starts firing earlier because Poisson "
         "input fluctuates, and ends lower because a spike in this model also empties g, which then has to rebuild. That is a property of "
         "the published model, copied on purpose."),
        ("Refractory freeze", freeze_figure(model),
         "The target spikes at step 18. For the next 22 steps its potential stays at zero. An input arriving at step 28 is added to g, "
         "which then neither decays nor moves v until step 41. The published code freezes both variables while refractory and still "
         "accepts arrivals; so does the oracle."),
    ]
    body = "".join(f'<h2>{title}</h2><img alt="{title}" src="data:image/png;base64,{png}"><p>{text}</p>' for title, png, text in sections)
    page = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
            '<title>Model check</title><style>body{font:15px/1.55 -apple-system,Segoe UI,sans-serif;max-width:760px;margin:32px auto;padding:0 18px;'
            'color:#22261d;background:#f7f6f1}img{max-width:100%;background:#fff;border:1px solid #d9dccf;border-radius:8px}h1{font-size:26px}'
            'h2{font-size:18px;margin-top:36px}p{color:#4b5142}</style></head><body><h1>Model check: '
            f'{model.id}</h1><p>Three pictures for a person. The gates are the fixtures under <code>contracts/fixtures</code> and the tests, '
            f'which demand exact equality.</p>{body}</body></html>')
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / "model-check.html"
    path.write_text(page, encoding="utf-8")
    return path
