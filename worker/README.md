# @counterfly/worker

The off-chain orchestrator that connects Attestcoin-verified RWA events to the
fruit-fly connectome replay engine and commits the resulting decision.

## Demo (no keys, no network)

```bash
npm run demo --workspace @counterfly/worker
```

This uses a synthetic Sepolia payment event and the deterministic pruned demo
graph, so it runs fully offline.

## Real MaleCNS v1.0 graph

Counterfly can replay the real `male-cns:v1.0` connectome (166,700 neurons and
25,582,938 directed connections) instead of the pruned demo graph.

```bash
# 1. Set up the local Python environment with numpy/pyarrow/pandas
python3 -m venv fly/.venv
fly/.venv/bin/pip install numpy pyarrow pandas

# 2. Download the Janelia source files (about 1.1 GB), verify their SHA-256,
#    and export a compact numpy graph to fly/data/malecns_v1.npz
npm run prepare:full --workspace @counterfly/worker

# 3. Run the counterfactual replay on the real connectome
npm run demo:full --workspace @counterfly/worker
npm run demo:full --workspace @counterfly/worker -- --scenario=RATE_SHOCK
```

The real-data path is the reproducible "digital brain" substrate. With the
current tuning, `BASE_REPLAY` maps to `HOLD` and `RATE_SHOCK` maps to
`ADJUST_LTV`. The abstract financial-feature mapping is an engineering choice
and is not biologically validated, so treat the output as a reproducible
stress-test signal rather than a claim that the connectome "understands"
finance.

To run the full read → replay pipeline on a real Sepolia transaction (the
on-chain commit is skipped unless `PRIVATE_KEY` and `COUNTERFLY_ASC_ADDRESS`
are set):

```bash
SEPOLIA_RPC=https://ethereum-sepolia-rpc.publicnode.com \
  npm run run --workspace @counterfly/worker -- 0x<sepolia-tx-hash>
```

## Real flow

```bash
# 1. Copy environment variables
cp .env.example .env

# 2. Verify a real Sepolia payment event and commit a decision
npm run run --workspace @counterfly/worker -- 0x<sepolia-tx-hash> --scenario=BASE_REPLAY
```

The real flow requires a funded worker key and a deployed `CounterflyASC`
address in `.env`.
