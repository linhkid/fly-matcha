"""Command line for the lab: ``python -m flylab <area> <command>``."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

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
        shown = {"at": -1}

        def progress(name: str, have: int, total: int) -> None:
            step = have * 20 // max(total, 1)          # a line every five percent, not every block
            if step != shown["at"]:
                shown["at"] = step
                print(f"  {name}: {have / 1e6:7.1f} of {total / 1e6:.1f} MB", file=sys.stderr, flush=True)

        for record in fetch.run(args.stage, consent=True, directory=RAW_DIR, progress=progress):
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


def _codec(args: argparse.Namespace) -> int:
    from flylab.codec.build import CodecError, write_codec, write_decoder, write_fixture, write_legs_codec

    if args.command == "decoder":   # only a passed experiment can write it
        from flylab.experiments.harness import EXPERIMENTS_DIR

        try:
            print("decoder:", write_decoder(EXPERIMENTS_DIR / "E01-taste-law"))
        except (CodecError, FileNotFoundError) as refusal:
            print("refused:", refusal)
            return 2
        return 0
    print("codec:  ", write_codec())
    print("fixture:", write_fixture())
    print("legs:   ", write_legs_codec())
    return 0


def _web(args: argparse.Namespace) -> int:
    from flylab.web.cloud import export_cloud

    if args.command == "recordings":   # needs the whole-brain graph: python -m flylab graph build
        from flylab.web.recordings import export_recordings

        index = export_recordings()
        total = sum(path.stat().st_size for path in index.parent.glob("*.json"))
        print(f"{index.parent}  {len(list(index.parent.glob('s*.json')))} recordings, {total / 1e6:.1f} MB")
        return 0
    for path in export_cloud():
        print(f"{path}  {path.stat().st_size / 1e6:.2f} MB")
    return 0


def _census(args: argparse.Namespace) -> int:
    from flylab.census.cli import run_census

    return run_census(args.circuit, RAW_DIR, CIRCUITS_DIR)


def _graph(args: argparse.Namespace) -> int:
    import pandas as pd

    from flylab import REPO_ROOT
    from flylab.data.fetch import ANNOTATIONS
    from flylab.graph import build, info
    from flylab.graph import format as fskg

    path = REPO_ROOT / "data" / "built" / "full" / "malecns.fskg" if args.path is None else args.path
    if args.command == "build":
        graph, manifest = build.build_full(RAW_DIR, progress=lambda rows: print(f"  {rows:,} rows", end="\r", file=sys.stderr))
        sha = fskg.write_graph(path, graph, manifest)
        print(f"\nwrote {path}: {graph.n:,} neurons, {graph.e:,} edges, sha256 {sha}")
    print(info.describe(path, pd.read_feather(RAW_DIR / ANNOTATIONS, columns=["bodyId", "type"])))
    return 0


def _exp(args: argparse.Namespace) -> int:
    from flylab.experiments import harness, mechanics, report

    if args.command == "gate":
        problems = mechanics.unlicensed()
        for problem in problems:
            print("mechanics gate:", problem)
        print("mechanics gate:", "FAIL" if problems else "ok")
        return 1 if problems else 0
    path = harness.EXPERIMENTS_DIR / args.experiment / "prereg.json"
    try:
        experiment = harness.Experiment(path, workers=args.workers)
        if args.command == "pilot":
            if args.set:   # pilot seeds at another point of the model, for a calibration the slice declared in advance
                point = {**experiment.prereg["shipped"], **{k: float(v) for k, v in (pair.split("=") for pair in args.set)}}
                conditions = args.conditions.split(",") if args.conditions else sorted(experiment.conditions)
                values, _ = experiment.measure(point, conditions, experiment.prereg["seeds"]["pilot"])
                pilot = {"values": values}
                print("  at", point)
            else:
                pilot = experiment.pilot()
            for measure, by_condition in pilot["values"].items():
                for condition, by_seed in by_condition.items():
                    print(f"  {measure:<8} {condition:<8} {[by_seed[s] for s in sorted(by_seed)]}")
            print("pilot seeds never count. Nothing was consumed.")
            return 0
        outcome = experiment.confirm()
    except harness.HarnessError as refusal:
        print("refused:", refusal)
        return 2
    verdict = outcome["verdict"]
    (path.parent / "report.html").write_text(report.render(experiment.prereg, verdict), encoding="utf-8")
    for result in verdict["criteria"]:
        word = "not run" if result.get("notRun") else "undecided" if result["pass"] is None else "pass" if result["pass"] else result["rejected"] or "fail"
        print(f"  {result['id']:<4} {word:<11} {result['kind']}")
    print(f"{verdict['id']}: {verdict['verdict']}   (plateau along {verdict['plateau']['param']}: {verdict['plateau']['passing']})")
    return 0


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

    codec = areas.add_parser("codec", help="write the codec and its fixture")
    codec.add_argument("command", choices=["build", "decoder"])
    codec.set_defaults(handler=_codec)

    web = areas.add_parser("web", help="export what the browser needs")
    web.add_argument("command", choices=["cloud", "recordings"])
    web.set_defaults(handler=_web)

    graph = areas.add_parser("graph", help="build and inspect the whole-brain graph (needs the stage B file)")
    graph.add_argument("command", choices=["build", "info"])
    graph.add_argument("path", nargs="?", type=Path, help="a .fskg file; default data/built/full/malecns.fskg")
    graph.set_defaults(handler=_graph)

    exp = areas.add_parser("exp", help="run a pre-registered experiment, or check the mechanics gate")
    exp.add_argument("command", choices=["pilot", "run", "gate"])
    exp.add_argument("experiment", nargs="?", help="experiment id, e.g. E00-synthetic")
    exp.add_argument("--workers", type=int, default=1)
    exp.add_argument("--set", action="append", help="pilot only: a model parameter to override, e.g. wSynMv=0.4")
    exp.add_argument("--conditions", help="pilot only: comma-separated condition ids")
    exp.set_defaults(handler=_exp)

    census = areas.add_parser("census", help="bind a circuit's roles to body IDs")
    census.add_argument("circuit", help="circuit name, e.g. taste")
    census.set_defaults(handler=_census)

    args = parser.parse_args(argv)
    return args.handler(args)


if __name__ == "__main__":
    sys.exit(main())
