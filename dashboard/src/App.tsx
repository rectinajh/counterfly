import { useState } from "react";
import { ACTION_LABELS, type FlyState } from "./types";
import { runMockReplay } from "./mock";

export function App() {
  const [state, setState] = useState<FlyState>(() => runMockReplay("BASE_REPLAY"));

  return (
    <main className="shell">
      <header className="hero">
        <p className="eyebrow">Counterfly</p>
        <h1>Don&apos;t trust the appraiser — reproduce the fly.</h1>
        <p className="lede">
          A reproducible counterfactual-history engine for RWA risk, powered by a
          fruit-fly connectome and Attestcoin-verified cross-chain data.
        </p>
      </header>

      <section className="controls">
        <button
          className={state.scenarioType === "BASE_REPLAY" ? "active" : ""}
          onClick={() => setState(runMockReplay("BASE_REPLAY"))}
        >
          Base replay
        </button>
        <button
          className={state.scenarioType === "RATE_SHOCK" ? "active" : ""}
          onClick={() => setState(runMockReplay("RATE_SHOCK"))}
        >
          Rate shock
        </button>
      </section>

      <section className="grid">
        <Panel
          title="1 · Attest"
          subtitle="Verified Sepolia event"
          items={[
            ["Payment tx", state.verifiedTx],
            ["Source chain", "Ethereum Sepolia"],
            ["Destination", "Creditcoin CC3 testnet"],
          ]}
        />

        <Panel
          title="2 · Replay"
          subtitle="Connectome readout"
          items={[
            ["Scenario", state.scenarioType],
            ["Motor axis", state.motorAxis.toFixed(3)],
            ["Graph", state.graphHash],
          ]}
        />

        <Panel
          title="3 · Commit"
          subtitle="ASC decision"
          items={[
            ["Action", ACTION_LABELS[state.action]],
            ["Replay hash", state.replayHash],
            ["Asset", state.assetId],
          ]}
          highlight={ACTION_LABELS[state.action]}
        />
      </section>

      <footer className="reproduce">
        <strong>Reproduce</strong>
        <span>
          Same graph + same scenario + same seed = same decision. Run{" "}
          <code>npm run demo --workspace @counterfly/worker</code>.
        </span>
      </footer>
    </main>
  );
}

function Panel(props: {
  title: string;
  subtitle: string;
  items: [string, string][];
  highlight?: string;
}) {
  return (
    <article className="panel">
      <div className="panel-head">
        <h2>{props.title}</h2>
        <span>{props.subtitle}</span>
      </div>
      <dl>
        {props.items.map(([label, value]) => (
          <div className="row" key={label}>
            <dt>{label}</dt>
            <dd className={label === "Action" ? "action" : ""}>{value}</dd>
          </div>
        ))}
      </dl>
      {props.highlight ? <div className="badge">{props.highlight}</div> : null}
    </article>
  );
}
