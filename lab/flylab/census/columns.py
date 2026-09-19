"""Look before binding: what the source tables actually contain."""

from __future__ import annotations

import pandas as pd


def describe_table(frame: pd.DataFrame, samples: int = 10) -> str:
    lines = [f"{len(frame):,} rows, {len(frame.columns)} columns"]
    for name in frame.columns:
        column = frame[name]
        present = column.dropna()
        try:
            distinct = present.nunique()
            values = list(present.drop_duplicates().head(samples))
        except TypeError:  # unhashable cells such as coordinate arrays
            distinct = -1
            values = [repr(v) for v in present.head(samples)]
        shown = ", ".join(str(v)[:40] for v in values)
        lines.append(f"  {name:<28} {str(column.dtype):<10} non-null {len(present):>8,}  distinct {distinct:>7,}  e.g. {shown}")
    return "\n".join(lines)


def describe_tables(tables: dict[str, pd.DataFrame]) -> str:
    return "\n".join(f"== {name}\n{describe_table(frame)}" for name, frame in tables.items())
