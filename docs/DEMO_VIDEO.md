# Demo video script (~90 seconds)

Record at **1920×1080**, dark browser theme. Primary capture target: [https://counterfly.vercel.app](https://counterfly.vercel.app).

## Beat sheet

| Time | Visual | Voice-over (English) |
| --- | --- | --- |
| 0–10s | Logo + title card | "Counterfly replaces the centralized RWA appraiser with a reproducible fruit-fly connectome and Attestcoin-verified cross-chain data." |
| 10–25s | Etherscan → canonical Sepolia tx | "We start with a real payment on Ethereum Sepolia. Attestcoin ProofBuilder and BlockProver verify it on Creditcoin CC3." |
| 25–40s | Dashboard **Recommended demo** | "One click replays MaleCNS v1.0 under a rate shock. The motor readout maps to LIQUIDATE — an auditable stress test, not a black-box score." |
| 40–55s | Attest panel shows **Attestcoin OK** | "Every input is hash-pinned: graph, scenario, replay. Anyone can re-run the same fly." |
| 55–70s | **Commit to CC3** → Blockscout tx | "The decision commits to our Attestcoin Smart Contract on CC3 testnet." |
| 70–85s | **Relay to Sepolia** → Etherscan | "A guarded relayer writes adjust LTV or liquidation to the RWA action contract — writability-ready when native outbox ships." |
| 85–90s | End card: repo + RWA track | "Open source on GitHub. Built for BUIDL CTC 2026 — don't trust the appraiser, reproduce the fly." |

## Local recording

```bash
npm run record:demo
# optional override: DEMO_DASHBOARD_URL=https://counterfly.vercel.app npm run record:demo
```

Output: [Counterfly-Demo.mp4](./Counterfly-Demo.mp4) (Playwright capture + macOS `say` narration).

## Upload checklist

- [x] Local master: `docs/Counterfly-Demo.mp4`
- [ ] Upload to YouTube or Loom (unlisted OK)
- [ ] Paste URL into DoraHacks **Prototype Demo Video URL**
- [ ] Set `DEMO_VIDEO_URL` in `.env`
