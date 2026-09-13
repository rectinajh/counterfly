# @counterfly/worker

The off-chain orchestrator that connects Attestcoin-verified RWA events to the
fruit-fly connectome replay engine and commits the resulting decision.

## Demo (no keys, no network)

```bash
npm run demo --workspace @counterfly/worker
```

This uses a synthetic Sepolia payment event and the deterministic pruned demo
graph, so it runs fully offline.

## Real flow

```bash
# 1. Copy environment variables
cp .env.example .env

# 2. Verify a real Sepolia payment event and commit a decision
npm run run --workspace @counterfly/worker -- 0x<sepolia-tx-hash> --scenario=BASE_REPLAY
```

The real flow requires a funded worker key and a deployed `CounterflyASC`
address in `.env`.
