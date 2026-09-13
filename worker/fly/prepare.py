#!/usr/bin/env python3
"""Prepare a Counterfly connectome graph.

--demo  Write the deterministic pruned demo graph to data/demo_graph.json.
--full  Download the real MaleCNS v1.0 connectome from Janelia, verify the
        source files, and export a compact numpy graph for the replay engine.

The real data is licensed CC-BY by the Male CNS Connectome Project
(FlyEM / HHMI Janelia, University of Cambridge, MRC LMB, Google Research).
"""

import argparse
import hashlib
import json
import sys
from pathlib import Path

from engine import make_demo_graph

DATA_DIR = Path(__file__).parent / "data"
RAW_DIR = DATA_DIR / "raw"

SOURCES = {
    "annotations.feather": {
        "url": "https://storage.googleapis.com/flyem-male-cns/v1.0/connectome-data/flat-connectome/body-annotations-male-cns-v1.0-minconf-0.5.feather",
        "bytes": 14483314,
        "sha256": "2177e246113e4cfbf1e7772ec37c6da1955ff22e8063d0b1f833101f99a9a3b2",
    },
    "neurotransmitters.feather": {
        "url": "https://storage.googleapis.com/flyem-male-cns/v1.0/connectome-data/flat-connectome/body-neurotransmitters-male-cns-v1.0.feather",
        "bytes": 43282834,
        "sha256": "95c9289220663abeb3409f3ad9e5a7f8a53f8093f5139d15502cd08da8879621",
    },
    "edges.feather": {
        "url": "https://storage.googleapis.com/flyem-male-cns/v1.0/connectome-data/flat-connectome/connectome-weights-male-cns-v1.0-minconf-0.5.feather",
        "bytes": 1051241946,
        "sha256": "e35da783d1c686b2b58b3b87cd6a403ae43bfcfba8bff28e08ef752c1a56afc1",
    },
}

SENSORY_SUPERCLASSES = {
    "vnc_sensory",
    "ol_sensory",
    "cb_sensory",
    "sensory_ascending",
    "sensory_descending",
    "visual_projection",
    "visual_centrifugal",
}

MOTOR_SUPERCLASSES = {
    "descending_neuron",
    "vnc_motor",
    "cb_motor",
    "vnc_efferent",
    "efferent_descending",
    "efferent_ascending",
    "sensory_descending",
}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(8 * 1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def write_demo() -> int:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    graph = make_demo_graph(seed=0)
    out = DATA_DIR / "demo_graph.json"
    out.write_text(json.dumps(graph, sort_keys=True), "utf-8")
    print(f"wrote {out}")
    return 0


def ensure_sources() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    for name, info in SOURCES.items():
        target = RAW_DIR / name
        if target.exists() and target.stat().st_size == info["bytes"]:
            if sha256_file(target) == info["sha256"]:
                print(f"verified {name}")
                continue

        print(f"downloading {name} ({info['bytes'] / 1e6:.0f} MB)...")
        import urllib.request

        partial = target.with_suffix(".download")
        urllib.request.urlretrieve(info["url"], partial)
        partial.replace(target)

        if target.stat().st_size != info["bytes"] or sha256_file(target) != info["sha256"]:
            raise RuntimeError(f"checksum mismatch for {name}")
        print(f"verified {name}")


def import_graph() -> dict:
    import numpy as np
    import pyarrow as pa
    import pyarrow.feather as feather
    import pyarrow.ipc as ipc

    annotations = feather.read_table(RAW_DIR / "annotations.feather").to_pandas()

    mask = (
        annotations["superclass"].notna()
        & annotations["superclass"].astype(str).str.strip().ne("")
    )
    if "status" in annotations.columns:
        mask &= annotations["status"].fillna("").astype(str).ne("Glia")

    nodes = annotations.loc[mask].sort_values("bodyId").reset_index(drop=True)
    ids = nodes["bodyId"].to_numpy(dtype=np.uint64)

    if len(np.unique(ids)) != len(ids):
        raise ValueError("duplicate bodyId in retained nodes")

    input_ids = np.flatnonzero(
        nodes["superclass"].isin(SENSORY_SUPERCLASSES).to_numpy()
    ).astype(np.uint32)
    output_ids = np.flatnonzero(
        nodes["superclass"].isin(MOTOR_SUPERCLASSES).to_numpy()
    ).astype(np.uint32)

    reader = ipc.open_file(pa.memory_map(str(RAW_DIR / "edges.feather"), "r"))
    total_rows = sum(reader.get_batch(i).num_rows for i in range(reader.num_record_batches))

    pre_index = np.empty(total_rows, dtype=np.uint32)
    post_index = np.empty(total_rows, dtype=np.uint32)
    weights = np.empty(total_rows, dtype=np.uint32)

    cursor = 0
    for i in range(reader.num_record_batches):
        batch = reader.get_batch(i)
        pre = batch.column(batch.schema.get_field_index("body_pre")).to_numpy(zero_copy_only=False)
        post = batch.column(batch.schema.get_field_index("body_post")).to_numpy(zero_copy_only=False)
        weight = batch.column(batch.schema.get_field_index("weight")).to_numpy(zero_copy_only=False)

        source_index = np.searchsorted(ids, pre)
        target_index = np.searchsorted(ids, post)
        keep = (source_index < len(ids)) & (target_index < len(ids))
        keep &= ids[np.minimum(source_index, len(ids) - 1)] == pre
        keep &= ids[np.minimum(target_index, len(ids) - 1)] == post

        count = int(keep.sum())
        pre_index[cursor : cursor + count] = source_index[keep].astype(np.uint32)
        post_index[cursor : cursor + count] = target_index[keep].astype(np.uint32)
        weights[cursor : cursor + count] = weight[keep].astype(np.uint32)
        cursor += count

    pre_index = pre_index[:cursor]
    post_index = post_index[:cursor]
    weights = weights[:cursor]

    incoming_strength = np.bincount(
        post_index, weights=weights.astype(np.float64), minlength=len(ids)
    )
    denominator = np.sqrt(incoming_strength[post_index])
    denominator[denominator == 0] = 1.0
    norm_weight = (weights / denominator).astype(np.float32)

    out_path = DATA_DIR / "malecns_v1.npz"
    np.savez(
        out_path,
        neuron_ids=ids,
        pre_index=pre_index,
        post_index=post_index,
        weight=weights,
        norm_weight=norm_weight,
        input_ids=input_ids,
        output_ids=output_ids,
    )

    meta = {
        "dataset": "male-cns:v1.0",
        "neuron_count": int(len(ids)),
        "edge_count": int(cursor),
        "input_count": int(len(input_ids)),
        "output_count": int(len(output_ids)),
        "node_policy": "retain rows with an assigned superclass; exclude explicit Glia status",
        "edge_policy": "all released edges between retained neurons; no extra weight threshold",
        "normalization": "weight / sqrt(total incoming synaptic weight per target)",
        "source_sha256": {name: info["sha256"] for name, info in SOURCES.items()},
        "license": "CC-BY",
    }

    graph_hash = hashlib.sha256(
        json.dumps(meta, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    meta["graph_hash"] = graph_hash

    (DATA_DIR / "malecns_v1.meta.json").write_text(json.dumps(meta, indent=2), "utf-8")

    out_degree = np.bincount(pre_index, minlength=len(ids))
    report = {
        **meta,
        "retained_synaptic_contacts": int(weights.sum(dtype=np.uint64)),
        "isolated_neurons": int(
            np.count_nonzero((out_degree == 0) & (incoming_strength == 0))
        ),
    }
    (DATA_DIR / "malecns_v1.report.json").write_text(
        json.dumps(report, indent=2), "utf-8"
    )

    print(
        json.dumps(
            {
                "dataset": meta["dataset"],
                "neuron_count": meta["neuron_count"],
                "edge_count": meta["edge_count"],
                "input_count": meta["input_count"],
                "output_count": meta["output_count"],
                "graph_hash": graph_hash,
            },
            indent=2,
        )
    )
    return report


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--demo", action="store_true")
    parser.add_argument("--full", action="store_true")
    args = parser.parse_args()

    if args.full:
        ensure_sources()
        import_graph()
        return 0

    return write_demo()


if __name__ == "__main__":
    sys.exit(main())
