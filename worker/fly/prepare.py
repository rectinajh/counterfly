#!/usr/bin/env python3
"""Prepare a Counterfly connectome graph.

--demo  Write the deterministic pruned demo graph to data/demo_graph.json.
--full  Export the real MaleCNS v1.0 connectome through NeuPrint.
        This path requires `neuprint-python` and a Janelia NeuPrint token.
"""

import argparse
import sys
from pathlib import Path

from engine import make_demo_graph


def write_demo(data_dir: Path) -> int:
    data_dir.mkdir(parents=True, exist_ok=True)
    graph = make_demo_graph(seed=0)
    out = data_dir / "demo_graph.json"
    out.write_text(__import__("json").dumps(graph, sort_keys=True), "utf-8")
    print(f"wrote {out}")
    return 0


def fetch_full(data_dir: Path) -> int:
    print("Full MaleCNS v1.0 export requires neuprint-python and a Janelia token.")
    print("Next steps:")
    print("  1. pip install neuprint-python")
    print("  2. export NEUPRINT_TOKEN=<your-janelia-token>")
    print("  3. query https://neuprint.janelia.org for the male-cns dataset")
    print("  4. export neurons/synapses into the Counterfly graph format")
    print("")
    print("This scaffold intentionally keeps the demo path fully offline.")
    return 1


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--demo", action="store_true")
    parser.add_argument("--full", action="store_true")
    args = parser.parse_args()

    data_dir = Path(__file__).parent / "data"

    if args.full:
        return fetch_full(data_dir)

    return write_demo(data_dir)


if __name__ == "__main__":
    sys.exit(main())
