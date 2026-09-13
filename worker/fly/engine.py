#!/usr/bin/env python3
"""Deterministic Counterfly connectome replay engine.

The engine turns a scenario (attested RWA history + a counterfactual
perturbation) into a reproducible motor readout and a risk action.

By default it uses a small deterministic pruned graph so the demo runs
without the full MaleCNS v1.0 download. Use `prepare.py --full` to export
a graph from the real connectome via NeuPrint.
"""

import argparse
import hashlib
import json
import math
import random
import sys
from pathlib import Path

ACTION_HOLD = 0
ACTION_ADJUST_LTV = 1
ACTION_LIQUIDATE = 2
ACTION_PAY_OUT = 3


def canonical(obj) -> str:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"))


def sha256_hex(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def make_demo_graph(seed: int = 0) -> dict:
    """Build a deterministic pruned demo graph.

    This is intentionally small so the replay is fast and reproducible.
    Replace it with a MaleCNS v1.0 export for a real audit run.
    """

    rng = random.Random(seed)
    neuron_count = 512
    edge_count = 2048
    sensory = list(range(0, 16))
    motor = list(range(neuron_count - 8, neuron_count))

    edges = []
    for _ in range(edge_count):
        edges.append(
            {
                "from": rng.randrange(neuron_count),
                "to": rng.randrange(neuron_count),
                "w": round(rng.uniform(-1.0, 1.0), 6),
            }
        )

    return {
        "meta": {
            "source": "demo-pruned",
            "version": "0.1.0",
            "neuronCount": neuron_count,
            "edgeCount": edge_count,
            "note": "Deterministic synthetic pruned graph for local demo.",
        },
        "sensory": sensory,
        "motor": motor,
        "edges": edges,
    }


def load_graph(graph_spec: str) -> dict:
    if graph_spec == "demo":
        return make_demo_graph(seed=0)

    path = Path(graph_spec)
    if not path.exists():
        raise FileNotFoundError(f"graph file not found: {path}")

    return json.loads(path.read_text("utf-8"))


def compute_features(scenario: dict) -> list:
    history = scenario.get("history", [])
    counterfactual = scenario.get("counterfactual", {})

    if not history:
        amounts = [0.0]
        lates = [0.0]
    else:
        amounts = [float(h.get("amount", 0)) for h in history]
        lates = [float(h.get("daysLate", 0)) for h in history]

    expected = max(1.0, sum(amounts) / max(1, len(amounts)))
    paid_ratio = min(1.0, sum(amounts) / (expected * len(amounts)))
    on_time_ratio = sum(1.0 for d in lates if d <= 7) / max(1, len(lates))
    avg_late = sum(lates) / max(1, len(lates))
    worst_late = max(lates)
    latest_trend = lates[-1] - lates[0] if len(lates) > 1 else 0.0

    volatility = 0.0
    if len(amounts) > 1:
        mean = sum(amounts) / len(amounts)
        volatility = math.sqrt(sum((a - mean) ** 2 for a in amounts) / len(amounts))
        volatility /= max(1.0, mean)

    magnitude = float(counterfactual.get("magnitude", 0.0))
    horizon = float(counterfactual.get("horizon", 12))
    horizon_norm = min(1.0, horizon / 24.0)

    return [
        paid_ratio,
        on_time_ratio,
        min(1.0, avg_late / 60.0),
        min(1.0, worst_late / 90.0),
        min(1.0, max(-1.0, latest_trend / 30.0)),
        min(1.0, volatility),
        max(-1.0, min(1.0, magnitude)),
        horizon_norm,
    ]


def interpolate(features: list, target_len: int) -> list:
    if target_len <= 0:
        return []
    if len(features) == target_len:
        return list(features)

    out = []
    for i in range(target_len):
        pos = i * (len(features) - 1) / max(1, target_len - 1)
        lo = int(math.floor(pos))
        hi = int(math.ceil(pos))
        frac = pos - lo
        out.append(features[lo] * (1.0 - frac) + features[hi] * frac)
    return out


def sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def simulate(graph: dict, stimuli: list, steps: int = 64) -> float:
    neuron_count = graph["meta"]["neuronCount"]
    sensory = graph["sensory"]
    motor = graph["motor"]

    incoming = [[] for _ in range(neuron_count)]
    in_degree = [0] * neuron_count
    for edge in graph["edges"]:
        in_degree[edge["to"]] += 1

    for edge in graph["edges"]:
        target = edge["to"]
        weight = edge["w"] / math.sqrt(max(1, in_degree[target]))
        incoming[target].append((edge["from"], weight))

    voltages = [0.0] * neuron_count
    leak = 0.85
    tail = []

    for _ in range(steps):
        inputs = [0.0] * neuron_count
        for idx, value in zip(sensory, stimuli):
            if 0 <= idx < neuron_count:
                inputs[idx] += value

        next_voltages = [0.0] * neuron_count
        for i in range(neuron_count):
            total = inputs[i]
            for source, weight in incoming[i]:
                total += weight * max(voltages[source], 0.0)
            next_voltages[i] = leak * voltages[i] + math.tanh(total)

        voltages = next_voltages
        motor_activity = sum(math.tanh(voltages[i]) for i in motor) / max(1, len(motor))
        tail.append(motor_activity)

    window = tail[-16:]
    avg = sum(window) / max(1, len(window))
    direct_sensory = sum(stimuli) / max(1, len(stimuli))
    return sigmoid(avg * 3.0 + direct_sensory * 1.5)


def action_from_axis(axis: float, scenario: dict) -> int:
    counterfactual = scenario.get("counterfactual", {})

    if counterfactual.get("type") == "HAZARD" and axis < 0.40:
        return ACTION_PAY_OUT
    if axis >= 0.65:
        return ACTION_HOLD
    if axis >= 0.40:
        return ACTION_ADJUST_LTV
    return ACTION_LIQUIDATE


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--scenario", required=True)
    parser.add_argument("--graph", default="demo")
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--steps", type=int, default=64)
    args = parser.parse_args()

    scenario = json.loads(Path(args.scenario).read_text("utf-8"))
    graph = load_graph(args.graph)

    features = compute_features(scenario)
    stimuli = interpolate(features, len(graph["sensory"]))
    magnitude = float(scenario.get("counterfactual", {}).get("magnitude", 0.0))
    if magnitude > 0:
        stimuli = [s - magnitude for s in stimuli]
    axis = simulate(graph, stimuli, steps=args.steps)
    action = action_from_axis(axis, scenario)

    graph_hash = sha256_hex(canonical(graph))
    scenario_for_hash = dict(scenario)
    scenario_for_hash.pop("scenarioHash", None)
    scenario_hash = sha256_hex(canonical(scenario_for_hash))
    replay_hash = sha256_hex(f"{graph_hash}:{scenario_hash}:{axis:.6f}:{action}")

    print(
        json.dumps(
            {
                "graphHash": graph_hash,
                "scenarioHash": scenario_hash,
                "motorAxis": round(axis, 6),
                "action": action,
                "replayHash": replay_hash,
            },
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
