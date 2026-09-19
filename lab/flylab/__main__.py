"""Command line for the lab: ``python -m flylab <area> <command>``."""

from __future__ import annotations

import argparse
import sys

from flylab import CIRCUITS_DIR, RAW_DIR


def _data(args: argparse.Namespace) -> int:
    from flylab.data import fetch

    if args.command == "plan":
        print(fetch.describe(fetch.plan(args.stage)))
        print("Nothing was downloaded. Fetch with: python -m flylab data fetch --stage", args.stage, "--yes")
        return 0
    if args.command == "fetch":
        if not args.yes:
            print(fetch.describe(fetch.plan(args.stage)))
            print("Refusing to download without --yes. Ask the user first (spec rule 8).")
            return 2
        for record in fetch.run(args.stage, consent=True, directory=RAW_DIR):
            print(f"verified {record.file}: {record.bytes:,} bytes, sha256 {record.sha256[:16]}…")
        return 0
    if args.command == "columns":
        import pandas as pd

        from flylab.census.columns import describe_tables

        print(describe_tables({name: pd.read_feather(RAW_DIR / name) for name in (fetch.ANNOTATIONS, fetch.TRANSMITTERS)}))
        return 0
    return 1


def _model(args: argparse.Namespace) -> int:
    if args.command == "check":
        from flylab import REPORTS_DIR
        from flylab.model.check import write_report

        print("report:", write_report(REPORTS_DIR))
    elif args.command == "fixtures":
        from flylab.model.fixtures import write_all

        print(f"{len(write_all())} fixtures written under contracts/fixtures")
    elif args.command == "probe":
        from flylab.model.probe import run

        regimes = (("quiet: 30 inputs, nothing propagates", dict(inputs=30)),
                   ("busy inputs: 400 inputs, nothing propagates", dict(inputs=400)),
                   ("propagating: 400 inputs, synapses strong enough to spread", dict(inputs=400, mean_synapses=60.0, steps=2_000)))
        for label, options in regimes:
            print(label)
            for key, value in run(**options).items():
                print(f"  {key:<26} {value}")
    return 0


def _census(args: argparse.Namespace) -> int:
    from flylab.census.cli import run_census

    return run_census(args.circuit, RAW_DIR, CIRCUITS_DIR)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="flylab")
    areas = parser.add_subparsers(dest="area", required=True)

    data = areas.add_parser("data", help="fetch and inspect source files")
    data.add_argument("command", choices=["plan", "fetch", "columns"])
    data.add_argument("--stage", choices=["A", "B"], default="A")
    data.add_argument("--yes", action="store_true", help="the user has said yes to this download in this session")
    data.set_defaults(handler=_data)

    model = areas.add_parser("model", help="the reference neuron model")
    model.add_argument("command", choices=["check", "fixtures", "probe"])
    model.set_defaults(handler=_model)

    census = areas.add_parser("census", help="bind a circuit's roles to body IDs")
    census.add_argument("circuit", help="circuit name, e.g. taste")
    census.set_defaults(handler=_census)

    args = parser.parse_args(argv)
    return args.handler(args)


if __name__ == "__main__":
    sys.exit(main())
