"""The report a person reads: the question, the verdict, and every criterion with what was observed."""

from __future__ import annotations

import json
from html import escape

STYLE = """body{font:15px/1.5 -apple-system,system-ui,sans-serif;max-width:920px;margin:32px auto;padding:0 18px;color:#1b1d18}
h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:26px 0 8px}.q{color:#555;margin:0 0 18px}
.verdict{display:inline-block;font-weight:700;padding:3px 12px;border-radius:999px;color:#fff}.pass{background:#2f7d4f}.fail{background:#a33a32}.none{background:#8a6d1d}
table{border-collapse:collapse;width:100%;font-size:14px}td,th{border-bottom:1px solid #ddd;padding:7px 8px;text-align:left;vertical-align:top}
code{font-size:12.5px;background:#f3f1ea;padding:1px 4px;border-radius:3px}.small{color:#666;font-size:13px}"""


def _chip(result: dict) -> str:
    if result.get("notRun"):
        return '<span class="verdict none">not run</span>'
    if result["pass"] is None:
        return '<span class="verdict none">passes at the shipped model; not taken further</span>'
    if result["pass"]:
        return '<span class="verdict pass">pass</span>'
    if result.get("rejected"):
        return f'<span class="verdict none">{escape(result["rejected"])}</span>'
    return '<span class="verdict fail">fail</span>'


def _observed(observed: dict) -> str:
    return escape(json.dumps(observed, sort_keys=True))[:420]


def render(prereg: dict, verdict: dict, extra_html: str = "") -> str:
    says = {c["id"]: c.get("says", "") for c in prereg["criteria"]}
    rows = "".join(
        f"<tr><td><b>{escape(r['id'])}</b><br><span class='small'>{escape(r['kind'])}</span></td><td>{escape(says[r['id']])}</td><td>{_chip(r)}</td>"
        f"<td class='small'>passes at {escape(str(r['passingValues']))}</td><td><code>{_observed(r['observed'])}</code></td></tr>"
        if r["passingValues"] is not None else
        f"<tr><td><b>{escape(r['id'])}</b><br><span class='small'>{escape(r['kind'])}</span></td><td>{escape(says[r['id']])}</td><td>{_chip(r)}</td>"
        f"<td class='small'>at the shipped model</td><td><code>{_observed(r['observed'])}</code></td></tr>"
        for r in verdict["criteria"])
    plateau = verdict["plateau"]
    inputs = verdict["inputs"]
    return f"""<!doctype html><meta charset="utf-8"><title>{escape(verdict['id'])}</title><style>{STYLE}</style>
<h1>{escape(verdict['id'])} <span class="verdict {'pass' if verdict['verdict'] == 'pass' else 'fail'}">{escape(verdict['verdict'])}</span></h1>
<p class="q">{escape(verdict['question'])}</p>
<h2>Criteria, written before the confirmation seeds ran</h2>
<table><tr><th>Id</th><th>The claim</th><th>Result</th><th>Along {escape(plateau['param'])}</th><th>Observed at the shipped model</th></tr>{rows}</table>
{"<p><b>Stopped early, as the pre-registration allows.</b> A claim passes only if it passes at the shipped model. One that needs no control failed there, so the verdict could no longer be a pass, and the rest of the sweep and the controls were not computed.</p>" if verdict.get("stoppedEarly") else ""}
<h2>The plateau rule</h2>
<p>Along <code>{escape(plateau['param'])}</code>, values {escape(str(plateau['values']))}: all swept criteria pass together at {escape(str(plateau['passing']))}.
A claim that passes at a single value is rejected. The rule {'holds' if plateau['holds'] else 'does not hold'}.</p>
{extra_html}
<h2>What it ran on</h2>
<p class="small">attempts {escape(str(verdict['attempts']))} · prereg <code>{escape(verdict['prereg']['sha256'][:16])}</code> at git <code>{escape(verdict['prereg']['gitRev'][:10])}</code> ·
graph <code>{escape(str(inputs['graphSha256'])[:16])}</code> · lock <code>{escape(str(inputs['lockSha256'])[:16])}</code> · codec <code>{escape(str(inputs['codecSha256'])[:16])}</code> · model {escape(inputs['modelId'])}<br>
shipped {escape(json.dumps(inputs['shipped']))} · seeds {escape(json.dumps(inputs['seeds']))}</p>
<p class="small">{escape(verdict.get('notes', ''))}</p>
"""
