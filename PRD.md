# Counterfly — Product Requirements Document

## 1. Product vision

Make RWA risk **reproducible instead of trusted**. Counterfly replaces the centralized appraiser/oracle with a deterministic, forkable biological decision network that replays Attestcoin-verified history and counterfactual scenarios into a small set of risk actions.

## 2. Problem

Tokenized RWA is transparent about ownership and transfers, but opaque about valuation and risk. The critical decisions — LTV, liquidation, payout — still depend on a centralized party and a non-reproducible model. This recreates a trusted third party inside a trustless system.

## 3. Target users and personas

| Persona | Need | Counterfly value |
| --- | --- | --- |
| RWA issuer | Prove cash-flow quality to investors | Reproducible stress test with attested evidence |
| Credit fund / lender | Set and defend LTV and liquidation thresholds | Auditable, scenario-based risk action |
| Auditor / rating challenger | Verify a risk claim independently | Re-run the same fly and compare outputs |
| Hackathon judges / investors | See novel, fundable infrastructure | Meme + depth: biological oracle with real Attestcoin integration |

## 4. Use cases

1. **Invoice / receivables financing** — replay verified payment history to decide whether to hold, adjust LTV, or liquidate a receivable-backed position.
2. **Solar or lease cash-flow assets** — replay weather/rate/demand counterfactuals to adjust a revenue-backed LTV.
3. **Parametric insurance** — replay an attested hazard event history to trigger or withhold a payout.

## 5. Goals and non-goals

### Goals

- Deliver a working `read → replay → write` loop on testnet.
- Make every replay reproducible from pinned inputs and a fixed seed.
- Demonstrate meaningful Attestcoin Protocol use, not just a mocked oracle.

### Non-goals

- Claim the fly "understands" finance or beats human analysts.
- Replace legal custody, KYC, or off-chain enforcement.
- Build a general-purpose trading bot.

## 6. Success metrics

- A Sepolia event is attested and verified on CC3 testnet.
- The same scenario + seed produces the same decision across independent runs.
- A decision hash is committed on-chain and a conditional cross-chain instruction is demonstrable.
- A non-technical viewer can understand the demo in under two minutes.

## 7. Functional requirements

### FR-1 Attestation ingestion

- Accept a source-chain transaction hash (e.g., a Sepolia payment event).
- Use the Attestcoin SDK to wait for attestation, generate a proof, and verify it on-chain.
- Build a canonical, hash-pinned history entry from verified events.

### FR-2 Scenario compiler

- Define an asset with an attested history root.
- Define counterfactual scenario parameters (interest rate, missed payment, hazard event).
- Compile both into deterministic sensory inputs for the connectome.

### FR-3 Connectome replay engine

- Load a pruned or full `MaleCNS v1.0` graph.
- Encode history + scenario into sensory stimulation.
- Run neural dynamics with a fixed random seed.
- Decode motor/output activity into an internal decision vector.

### FR-4 Decision mapper

- Map the decision vector to a small action set:
  - `HOLD`
  - `ADJUST_LTV`
  - `LIQUIDATE`
  - `PAY_OUT`
- Emit a `Decision` with `replayHash`, `action`, and optional parameters.

### FR-5 ASC commit and cross-chain write

- Submit a `Scenario` and commit a `Decision` to the Counterfly ASC on CC3 testnet.
- Record the replay result hash on-chain for auditability.
- Demonstrate the writability path: a conditional instruction to a Sepolia action contract.

### FR-6 Dashboard

- Show attested inputs, replay state, neural activity, and the final decision.
- Provide a "reproduce" view that explains how a third party can re-run the same result.

## 8. Non-functional requirements

- **Determinism** — fixed seed and pinned data must yield identical decisions.
- **Reproducibility** — all inputs, graph versions, and parameters are hash-referenced.
- **Latency** — replay must complete fast enough for a live demo.
- **Auditability** — every on-chain decision links to its input history root.
- **Safety** — a human/legal kill-switch must remain possible for real collateral.

## 9. MVP scope (hackathon)

- One ASC deployed to CC3 testnet.
- One Sepolia payment event attested and verified.
- One pruned connectome replay producing `HOLD` / `ADJUST_LTV` / `LIQUIDATE`.
- One on-chain decision commit + one demonstrated cross-chain instruction.
- README, PRD, technical documentation, 90-second demo video, and deck.

## 10. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Judges see the fly as a gimmick | Anchor every feature to an Attestcoin read/write and a real RWA decision |
| Connectome simulation is slow | Prune to a demo-fast subgraph; keep full graph optional |
| Non-determinism across machines | Pin graph, parameters, seed, and library versions |
| "Reproduce the fly" is confused with investment advice | Explicit disclaimers; frame as stress-testing, not prediction |
| Originality requirement | Use open MaleCNS data, but keep all application code original |

## 11. Milestones

1. **M1 — Attest loop**: verify a Sepolia event on CC3 testnet.
2. **M2 — Replay loop**: scenario → connectome → decision.
3. **M3 — Commit loop**: ASC decision commit + cross-chain write demo.
4. **M4 — Presentation**: dashboard, deck, video, and documentation.
