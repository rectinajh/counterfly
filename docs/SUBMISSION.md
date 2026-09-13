# BUIDL CTC 2026 Fall — DoraHacks submission copy

Use this when filling the [DoraHacks form](https://dorahacks.io/hackathon/buidl-ctc/detail).

## Project name

Counterfly

## Sector

RWA (Real-World Assets)

## Short description

Counterfly is a reproducible counterfactual-history engine for tokenized RWA risk. It uses **Attestcoin readability** (ProofBuilder + BlockProver on Creditcoin CC3) to verify Sepolia payment events, replays attested history and what-if scenarios through the open **MaleCNS v1.0** connectome, commits EIP-712 decisions to a **Counterfly ASC**, and demonstrates cross-chain write-back to a Sepolia **RwaAction** contract via an auditable relayer bridge.

## GitHub

`<your-repo-url>`

## Deck

[docs/Counterfly-Deck.pdf](./Counterfly-Deck.pdf)

## Demo

- Web: [https://counterfly.vercel.app](https://counterfly.vercel.app)
- Full pipeline (Attest + commit + relay): self-host worker — see [README](../README.md#public-demo)

## Demo video

See [docs/DEMO_VIDEO.md](./DEMO_VIDEO.md) — paste your uploaded URL here before submit.

## Attestcoin integration (for judges)

| Layer | Implementation |
| --- | --- |
| Read | `@gluwa/usc-sdk` ProofBuilder + BlockProver precompile; `GET /api/attest` |
| ASC | `CounterflyASC.sol` — verified source tx registration, scenario submit, decision commit |
| Write-back | `worker/src/relay.ts` → Sepolia `RwaAction.sol` (native writability stub in `writability.ts`) |

Based on [attestcoin-protocol-examples](https://github.com/gluwa/attestcoin-protocol-examples).

## Scoring alignment (CEIP five pillars)

1. **User expansion** — RWA issuers, lenders, and auditors re-run the same fly; roadmap ties to Creditcoin credit rails.
2. **Technical alignment** — Attestcoin readability is on the hot path; ASC optional `verifySourceAndRegister` calls BlockProver `0xFD2`.
3. **Product vision** — Reproducible biological oracle + counterfactual history for RWA risk.
4. **Execution** — Testnet deploys, CI golden replay tests, dashboard one-click demo, open docs.
5. **Market relevance** — Invoice, solar, and parametric insurance presets mapped to on-chain actions.
