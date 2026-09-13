import { useCallback, useEffect, useState } from "react";
import {
  commitDecision,
  getState,
  getTimeline,
  getWriteback,
  relayDecision,
  runReplay,
} from "./api";
import { txExplorerUrl } from "./explorer";
import {
  ACTION_LABELS,
  SCENARIO_LABELS,
  type GraphMode,
  type ReplayState,
  type ScenarioType,
  type TimelineEvent,
  type WritebackStatus,
} from "./types";

const SCENARIOS: ScenarioType[] = [
  "BASE_REPLAY",
  "RATE_SHOCK",
  "MISSED_PAYMENT",
  "HAZARD",
];

const DEFAULT_MAGNITUDE: Record<ScenarioType, number> = {
  BASE_REPLAY: 0,
  RATE_SHOCK: 0.2,
  MISSED_PAYMENT: 0.5,
  HAZARD: 0.8,
};

export function App() {
  const [state, setState] = useState<ReplayState | null>(null);
  const [graph, setGraph] = useState<GraphMode>("demo");
  const [scenario, setScenario] = useState<ScenarioType>("BASE_REPLAY");
  const [magnitude, setMagnitude] = useState(DEFAULT_MAGNITUDE.BASE_REPLAY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [writeback, setWriteback] = useState<WritebackStatus | null>(null);
  const [writebackLoading, setWritebackLoading] = useState(false);
  const [writebackAction, setWritebackAction] = useState<
    "commit" | "relay" | null
  >(null);
  const [writebackError, setWritebackError] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  const refreshWriteback = useCallback(async (assetId: string) => {
    try {
      const status = await getWriteback(assetId);
      setWriteback(status);
      setWritebackError(status.error ?? null);
    } catch (cause) {
      setWriteback(null);
      setWritebackError(cause instanceof Error ? cause.message : "Write-back read failed");
    }
  }, []);

  const refreshTimeline = useCallback(async () => {
    try {
      setTimeline(await getTimeline());
    } catch {
      // Keep the last known timeline if the API is temporarily unavailable.
    }
  }, []);

  const execute = useCallback(
    async (nextGraph: GraphMode, nextScenario: ScenarioType, nextMagnitude: number) => {
      setLoading(true);
      setError(null);
      try {
        const result = await runReplay({
          graph: nextGraph,
          scenario: nextScenario,
          magnitude: nextMagnitude,
        });
        setState(result);
        setWriteback(null);
        void refreshWriteback(result.assetId);
        void refreshTimeline();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unknown replay error");
      } finally {
        setLoading(false);
      }
    },
    [refreshWriteback, refreshTimeline],
  );

  useEffect(() => {
    let cancelled = false;

    getState()
      .then((saved) => {
        if (cancelled) {
          return;
        }

        if (saved) {
          setState(saved);
          setGraph(saved.mode);
          setScenario(saved.scenarioType);
          setMagnitude(saved.magnitude);
          setLoading(false);
          void refreshTimeline();
          return;
        }

        return execute("demo", "BASE_REPLAY", 0);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Unknown server error");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [execute, refreshTimeline]);

  const chooseScenario = (nextScenario: ScenarioType) => {
    setScenario(nextScenario);
    const nextMagnitude = DEFAULT_MAGNITUDE[nextScenario];
    setMagnitude(nextMagnitude);
    void execute(graph, nextScenario, nextMagnitude);
  };

  const chooseGraph = (nextGraph: GraphMode) => {
    setGraph(nextGraph);
    void execute(nextGraph, scenario, magnitude);
  };

  const submit = () => {
    void execute(graph, scenario, magnitude);
  };

  const commit = async () => {
    if (!state) {
      return;
    }

    setWritebackLoading(true);
    setWritebackAction("commit");
    setWritebackError(null);
    try {
      await commitDecision(state.assetId, state.replayHash, state.action);
      await refreshWriteback(state.assetId);
      await refreshTimeline();
    } catch (cause) {
      setWritebackError(
        cause instanceof Error ? cause.message : "Commit failed",
      );
    } finally {
      setWritebackLoading(false);
      setWritebackAction(null);
    }
  };

  const relay = async () => {
    if (!state) {
      return;
    }

    setWritebackLoading(true);
    setWritebackAction("relay");
    setWritebackError(null);
    try {
      await relayDecision(state.assetId);
      await refreshWriteback(state.assetId);
      await refreshTimeline();
    } catch (cause) {
      setWritebackError(
        cause instanceof Error ? cause.message : "Relay failed",
      );
    } finally {
      setWritebackLoading(false);
      setWritebackAction(null);
    }
  };

  const lastCommit = latestEventOfType(timeline, "commit");
  const lastRelay = latestEventOfType(timeline, "relay");

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
        <div className="control-group">
          <span className="control-label">Brain</span>
          <div className="segmented">
            <button
              className={graph === "demo" ? "active" : ""}
              onClick={() => chooseGraph("demo")}
              disabled={loading}
            >
              Demo brain
            </button>
            <button
              className={graph === "full" ? "active" : ""}
              onClick={() => chooseGraph("full")}
              disabled={loading}
            >
              MaleCNS v1.0
            </button>
          </div>
        </div>

        <div className="control-group">
          <span className="control-label">Counterfactual</span>
          <div className="segmented">
            {SCENARIOS.map((item) => (
              <button
                key={item}
                className={scenario === item ? "active" : ""}
                onClick={() => chooseScenario(item)}
                disabled={loading}
              >
                {SCENARIO_LABELS[item]}
              </button>
            ))}
          </div>
        </div>

        <div className="control-group">
          <label className="control-label" htmlFor="magnitude">
            Magnitude
          </label>
          <input
            id="magnitude"
            type="number"
            min="-1"
            max="1"
            step="0.05"
            value={magnitude}
            onChange={(event) => setMagnitude(Number(event.target.value))}
            disabled={loading}
          />
          <button className="run" onClick={submit} disabled={loading}>
            {loading ? "Replaying…" : "Run replay"}
          </button>
        </div>
      </section>

      {error ? (
        <section className="error">
          <strong>Backend unavailable</strong>
          <span>
            Start the worker API with{" "}
            <code>npm run serve -w @counterfly/worker</code> and retry. {error}
          </span>
          <button onClick={submit} disabled={loading}>
            Retry
          </button>
        </section>
      ) : null}

      {state ? (
        <>
          <section className="grid">
            <Panel
              title="1 · Attest"
              subtitle="Verified source event"
              items={[
                ["Payment tx", shortHash(state.sourceEvent.txHash)],
                ["Block", String(state.sourceEvent.blockNumber)],
                ["Brain", state.mode === "full" ? "MaleCNS v1.0" : "Demo brain"],
              ]}
            />

            <Panel
              title="2 · Replay"
              subtitle="Connectome readout"
              items={[
                ["Scenario", state.scenarioType],
                ["Motor axis", state.motorAxis.toFixed(3)],
                ["Neurons", formatNumber(state.neuronCount)],
                ["Edges", formatNumber(state.edgeCount)],
                ["Graph", shortHash(state.graphHash)],
              ]}
            />

            <Panel
              title="3 · Commit"
              subtitle={
                state.writability?.mode === "native-outbox"
                  ? "Native writability"
                  : "ASC decision"
              }
              items={[
                ["Action", ACTION_LABELS[state.action]],
                ["Replay hash", shortHash(state.replayHash)],
                ["Asset", shortHash(state.assetId)],
                [
                  "Write-back",
                  state.writability?.mode === "native-outbox"
                    ? "Attestcoin outbox"
                    : "Relayer bridge",
                ],
              ]}
              highlight={ACTION_LABELS[state.action]}
            />
          </section>

          <section className="writeback">
            <div className="panel-head">
              <h2>4 · Write-back</h2>
              <span>CC3 ASC → Sepolia RwaAction</span>
            </div>

            <div className="writeback-body">
              <div className="writeback-status">
                <div className="status-row">
                  <span>ASC decision</span>
                  {writeback?.committed && lastCommit?.txHash ? (
                    <a
                      href={txExplorerUrl("cc3", lastCommit.txHash)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      committed {shortHash(lastCommit.txHash)} ↗
                    </a>
                  ) : (
                    <code>
                      {writeback?.committed ? "committed" : "not committed"}
                    </code>
                  )}
                </div>
                <div className="status-row">
                  <span>Sepolia RWA</span>
                  <span className="status-value">
                    <code>
                      {writeback?.rwaLiquidated
                        ? "liquidated"
                        : `LTV ${writeback?.rwaLtvBps ?? "—"} bps`}
                    </code>
                    {lastRelay?.txHash ? (
                      <a
                        href={txExplorerUrl("sepolia", lastRelay.txHash)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {shortHash(lastRelay.txHash)} ↗
                      </a>
                    ) : null}
                  </span>
                </div>
              </div>

              {writebackError ? (
                <div className="writeback-error">{writebackError}</div>
              ) : null}

              <div className="writeback-actions">
                <button
                  className="run"
                  onClick={commit}
                  disabled={writebackLoading || !state}
                >
                  {writebackAction === "commit"
                    ? "Committing…"
                    : "Commit to CC3"}
                </button>
                <button
                  onClick={relay}
                  disabled={
                    writebackLoading || !writeback?.committed || !state
                  }
                >
                  {writebackAction === "relay"
                    ? "Relaying…"
                    : "Relay to Sepolia"}
                </button>
              </div>
            </div>
          </section>

          <section className="timeline">
            <div className="panel-head">
              <h2>5 · Event timeline</h2>
              <span>Replay → Commit → Relay</span>
            </div>

            {timeline.length === 0 ? (
              <p className="timeline-empty">No events recorded yet.</p>
            ) : (
              <ol className="timeline-list">
                {timeline.map((event) => (
                  <li className="timeline-item" key={event.id}>
                    <span className={`timeline-dot ${event.type}`} />
                    <div className="timeline-content">
                      <div className="timeline-meta">
                        <span className={`timeline-type ${event.type}`}>
                          {event.type}
                        </span>
                        <time>
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </time>
                      </div>
                      <div className="timeline-detail">
                        <span>{event.detail}</span>
                        <span className="muted">
                          {ACTION_LABELS[event.action]} ·{" "}
                          {event.graph === "full"
                            ? "MaleCNS v1.0"
                            : "Demo brain"}{" "}
                          · {shortHash(event.assetId)}
                        </span>
                      </div>
                      {event.txHash && event.chain ? (
                        <a
                          className="explorer-link"
                          href={txExplorerUrl(event.chain, event.txHash)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View on{" "}
                          {event.chain === "cc3" ? "Blockscout" : "Etherscan"} ↗
                        </a>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="hashes">
            <div className="hash-block">
              <span>Scenario hash</span>
              <code>{state.scenarioHash}</code>
            </div>
            <div className="hash-block">
              <span>Replay hash</span>
              <code>{state.replayHash}</code>
            </div>
            <div className="hash-block">
              <span>Graph hash</span>
              <code>{state.graphHash}</code>
            </div>
          </section>

          <footer className="reproduce">
            <strong>Reproduce</strong>
            <span>
              Same graph + same scenario + same seed = same decision. Run{" "}
              <code>npm run demo -w @counterfly/worker</code> or hit{" "}
              <code>/api/run</code> with the same parameters.
            </span>
          </footer>
        </>
      ) : null}
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

function shortHash(hash: string): string {
  if (hash.length <= 18) {
    return hash;
  }
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function latestEventOfType(
  events: TimelineEvent[],
  type: TimelineEvent["type"],
): TimelineEvent | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    if (events[index].type === type) {
      return events[index];
    }
  }
  return undefined;
}
