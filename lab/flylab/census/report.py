"""Render a census as one self-contained HTML page. A rendering only: every fact comes from ``census``."""

from __future__ import annotations

from html import escape
from urllib.parse import quote

EXPLORER = "https://reiserlab.github.io/celltype-explorer-drosophila-male-cns/types/{}.html"
MAX_TYPE_LINKS = 14

STYLE = """
:root{--bg:#f7f6f1;--fg:#22261d;--muted:#5d6354;--card:#fff;--border:#d9dccf;--ok:#3f6b1f;--ok-bg:#e6eed8;--bad:#9b2f2f;--bad-bg:#f6dede;--warn:#8a5a00;--warn-bg:#f6ead0}
@media (prefers-color-scheme:dark){:root{--bg:#161811;--fg:#e9ebe2;--muted:#a3a898;--card:#1f2219;--border:#363a2d;--ok:#a9cc6e;--ok-bg:#2a331c;--bad:#e58a8a;--bad-bg:#3a1f1f;--warn:#e2b35a;--warn-bg:#3a2f16}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
main{max-width:1180px;margin:0 auto;padding:28px 18px 60px}h1{font-size:26px;margin:0 0 4px}h2{font-size:18px;margin:36px 0 8px}
p.note{color:var(--muted);max-width:90ch;margin:4px 0 12px}code{font:12.5px ui-monospace,SFMono-Regular,Menlo,monospace}
.wrap{overflow-x:auto;background:var(--card);border:1px solid var(--border);border-radius:10px}
table{border-collapse:collapse;width:100%}th,td{text-align:left;vertical-align:top;padding:7px 10px;border-bottom:1px solid var(--border)}
th{font-size:11.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}tr:last-child td{border-bottom:0}
.chip{display:inline-block;font-size:11.5px;font-weight:600;padding:1px 8px;border-radius:999px;white-space:nowrap}
.ok{background:var(--ok-bg);color:var(--ok)}.bad{background:var(--bad-bg);color:var(--bad)}.warn{background:var(--warn-bg);color:var(--warn)}.plain{border:1px solid var(--border);color:var(--muted)}
.verdict{border-radius:10px;padding:14px 16px;margin:14px 0;border:1px solid var(--border)}.verdict.pass{background:var(--ok-bg)}.verdict.fail{background:var(--bad-bg)}
.small{color:var(--muted);font-size:12.5px}
.role{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin:10px 0}.role header{display:flex;flex-wrap:wrap;gap:6px 8px;align-items:baseline}
.role header code{font-size:14px;font-weight:700}.role .facts{margin-left:auto;font-size:13px}.role p{margin:6px 0 0;max-width:110ch}.role p.words{font-size:14.5px}
.role p.caveat{background:var(--warn-bg);color:var(--warn);border-radius:6px;padding:6px 9px;font-size:13px}a{color:inherit}details{margin-top:10px}pre{overflow-x:auto;font:12px ui-monospace,Menlo,monospace}
"""


def _type_links(types: list[str]) -> str:
    links = [f'<a href="{EXPLORER.format(quote(t, safe=""))}"><code>{escape(t)}</code></a>' for t in types[:MAX_TYPE_LINKS]]
    more = f' <span class="small">and {len(types) - MAX_TYPE_LINKS} more</span>' if len(types) > MAX_TYPE_LINKS else ""
    return ", ".join(links) + more


def _source(text: str) -> str:
    parts = [f'<a href="{escape(p)}">{escape(p)}</a>' if p.startswith("http") else escape(p) for p in text.split(" ")]
    return " ".join(parts)


def _table(headers: list[str], rows: list[list[str]]) -> str:
    head = "".join(f"<th>{escape(h)}</th>" for h in headers)
    body = "".join("<tr>" + "".join(f"<td>{cell}</td>" for cell in row) + "</tr>" for row in rows)
    return f'<div class="wrap"><table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table></div>'


def render(circuit: dict, result, anchors: list[dict], aliases: list[dict], gate: dict,
           inventory: list[dict], provenance: dict, columns_text: str) -> str:
    failures_by_group: dict[str, list] = {}
    for failure in result.failures:
        failures_by_group.setdefault(failure.group, []).append(failure)

    role_cards = []
    for role in circuit["roles"]:
        bound = result.bound.get(role["id"])
        chips = []
        if bound:
            chips.append('<span class="chip ok">bound</span>')
            unknown = f' · side unknown {bound.per_side["unknown"]}' if bound.per_side["unknown"] else ""
            nts = ", ".join(f"{escape(k)} {v}" for k, v in sorted(bound.nt_histogram.items(), key=lambda kv: -kv[1]))
            if bound.nt_confidence is not None:
                nts += f' <span class="small">(median confidence {bound.nt_confidence:.2f})</span>'
            facts = f'<strong>{len(bound.body_ids):,}</strong> neurons · L {bound.per_side["L"]:,} · R {bound.per_side["R"]:,}{unknown} · {nts}'
            basis = (role.get("expect") or {}).get("basis")
            pinned = {"observed": "Count pinned from this file, to catch drift; not evidence.", "anchor": "Count seen on the cell type explorer before download.",
                      "paper": "Count follows from the paper's assignment."}.get(basis, "")
            detail = f'Types: {_type_links(bound.types)}<br>Matched by: {escape(bound.matched_by)}' + (f"<br>{pinned}" if pinned else "")
        else:
            problems = failures_by_group.get(role["id"], [])
            chips += [f'<span class="chip {"bad" if role["required"] else "warn"}">{escape(p.code)}</span>' for p in problems]
            facts = "not bound"
            detail = "<br>".join(escape(str(p.found)) + (" → nearest: " + escape(", ".join(p.nearest)) if p.nearest else "") for p in problems)
        if role["required"]:
            chips.append('<span class="chip plain">required</span>')
        if role.get("flag"):
            chips.append(f'<span class="chip warn">{escape(role["flag"])}</span>')
        evidence = role["evidence"]
        caveat = f'<p class="caveat">{escape(role["caveat"])}</p>' if role.get("caveat") else ""
        role_cards.append(
            f'<article class="role"><header><code>{escape(role["id"])}</code> <span class="small">{escape(role["role"])}</span> {" ".join(chips)}'
            f'<span class="facts">{facts}</span></header>'
            f'<p class="words">{escape(role["explain"])}</p>{caveat}'
            f'<p class="small">{detail}</p>'
            f'<p class="small"><span class="chip plain">{escape(evidence["kind"])}</span> {escape(evidence["claim"])}<br>{_source(evidence["source"])}</p></article>'
        )

    alias_rows = []
    for alias in aliases:
        if alias["matches"]:
            where = "<br>".join(f'<a href="{EXPLORER.format(quote(m["type"], safe=""))}"><code>{escape(m["type"])}</code></a> '
                                f'<span class="small">{m["neurons"]} neurons, via {escape(m["column"])}: “{escape(m["value"])}”</span>' for m in alias["matches"])
        else:
            where = '<span class="chip warn">none</span>'
        is_type = '<span class="chip ok">is a type</span>' if alias["isType"] else '<span class="chip plain">not a type name</span>'
        alias_rows.append([f'<code>{escape(alias["name"])}</code>', escape(alias.get("context", "")), is_type, where, escape(alias.get("note", ""))])

    anchor_rows = [[f'<code>{escape(a["type"])}</code>', str(a["expected"]), escape(a.get("seen", "")), str(a["found"]),
                    '<span class="chip ok">matches</span>' if a["matches"] else '<span class="chip bad">differs</span>',
                    escape(a.get("explanation") or "")] for a in anchors]

    inventory_rows = [[escape(str(r["subclass"])), f'<code>{escape(str(r["type"]))}</code>', escape(str(r["receptorType"] or "")),
                       escape(str(r["entryNerve"] or "")), str(r["neurons"])] for r in inventory]

    notes = "".join(f'<h3 style="font-size:15px;margin:18px 0 4px">{escape(n["title"])}</h3><p class="note">{escape(n["text"])}</p>' for n in circuit.get("notes", []))
    reasons = "".join(f"<li>{escape(r)}</li>" for r in gate["reasons"])
    verdict_html = ('<div class="verdict pass"><strong>Census gate: PASS.</strong> Every required role is bound on independent evidence and every anchor is accounted for.</div>'
                    if gate["pass"] else f'<div class="verdict fail"><strong>Census gate: FAIL.</strong><ul>{reasons}</ul></div>')
    lock_line = "A lock was written." if not result.required_failures else "No lock was written, because a required role failed."

    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Census: {escape(circuit["circuit"])}</title><style>{STYLE}</style></head><body><main>
<h1>Census: the {escape(circuit["circuit"])} circuit</h1>
<p class="note">{escape(circuit.get("description", ""))}</p>
<p class="small">Dataset {escape(provenance["dataset"])} · annotations sha256 <code>{escape(provenance["annotationsSha256"][:16])}…</code> · {provenance["annotated"]:,} annotated bodies, {provenance["typed"]:,} with a type · {lock_line}</p>
{verdict_html}
<h2>Roles</h2>
<p class="note">Identity comes from annotations and papers only. No population here was chosen for what it does in a simulation.</p>
{"".join(role_cards)}
<h2>Literature names</h2>
<p class="note">Names used in papers, looked up in the dataset's own cross-match columns. A name with no match cannot be queried and must not be designed around.</p>
{_table(["Name", "Context", "", "MaleCNS type that carries it", "Note"], alias_rows)}
<h2>Anchors</h2>
<p class="note">Counts seen elsewhere before this file was downloaded. A difference must be explained, not accepted.</p>
{_table(["Type", "Expected", "Seen where", "Found", "", "Explanation"], anchor_rows)}
<h2>Inventory</h2>
<p class="note">{escape(circuit.get("inventory", {}).get("caption", ""))}</p>
{_table(["Subclass", "Type", "Receptor type", "Entry nerve", "Neurons"], inventory_rows)}
<h2>Notes</h2>{notes}
<details><summary>Every column of the two source tables</summary><pre>{escape(columns_text)}</pre></details>
</main></body></html>
"""
