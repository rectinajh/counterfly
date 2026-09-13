# Reproduce a Counterfly decision

Third parties can audit a risk action by re-running the same pinned inputs.

## Golden demo brain (512 neurons)

Prerequisites: Node 20+, Python 3 with `worker/fly/engine.py` dependencies optional for demo graph.

```bash
npm install
npm run demo -w @counterfly/worker
npm run demo -w @counterfly/worker -- --scenario=RATE_SHOCK
```

Expected `replayHash` values (seed `0`, graph `demo`):

| Scenario | Magnitude | Action | replayHash |
| --- | ---: | --- | --- |
| `BASE_REPLAY` | 0 | HOLD (0) | `4e4e2a622692c63345a82bdee34758555364fe614360fc8828bf094d1bc3bd3b` |
| `RATE_SHOCK` | 0.2 | ADJUST_LTV (1) | `1345c0c3b1d70967c2432953d11f66ef6717b8cb326e08063806f04136413e92` |

CI asserts these via `worker/src/replay.test.ts`.

## Live Attestcoin readability

Canonical Sepolia payment transaction (MaleCNS / judge path):

```text
txHash: 0xfcb1d4277b56b03ed2e0fb536f5ec32f26abcc6e149a00f9bb3c729750b1afba
block:  11695624
chainKey: 1 (Sepolia on CC3 testnet)
```

Verify on CC3:

```bash
curl "http://localhost:8787/api/attest?txHash=0xfcb1d4277b56b03ed2e0fb536f5ec32f26abcc6e149a00f9bb3c729750b1afba"
```

Or CLI:

```bash
npm run run -w @counterfly/worker -- 0xfcb1d4277b56b03ed2e0fb536f5ec32f26abcc6e149a00f9bb3c729750b1afba
```

Set `SKIP_ATTEST=true` only for offline CI; never for production demos.

## Full MaleCNS v1.0

```bash
python3 -m venv worker/fly/.venv
worker/fly/.venv/bin/pip install numpy pyarrow pandas
npm run prepare:full -w @counterfly/worker
npm run demo:full -w @counterfly/worker -- --scenario=RATE_SHOCK --magnitude=0.8
```

## On-chain artifacts

After redeploying ASC v2 (`npm run deploy:cc3 -w @counterfly/contracts`):

1. Worker registers the verified source tx on `CounterflyASC`.
2. Worker submits the scenario (`historyMerkleRoot`, `scenarioHash`).
3. Worker commits the EIP-712 decision.
4. Relayer calls `RwaAction` on Sepolia.

See [README](../README.md) for current contract addresses.
