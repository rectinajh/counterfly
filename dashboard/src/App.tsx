import { useCallback, useEffect, useState } from "react";
import {
  commitDecision,
  getCapabilities,
  getState,
  getTimeline,
  getWriteback,
  relayDecision,
  runReplay,
} from "./api";
import { CyberFly } from "./CyberFly";
import { txExplorerUrl } from "./explorer";
import { FLOW_STEPS, QUICK_TIPS, type FlowStepId } from "./flowSteps";
import {
  ACTION_LABELS,
  SCENARIO_LABELS,
  SCENARIO_RWA_HINT,
  type GraphMode,
  type PipelineCapabilities,
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

const TIPS_KEY = "counterfly-tips-dismissed";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  const [capabilities, setCapabilities] = useState<PipelineCapabilities | null>(
    null,
  );
  const [sessionStarted, setSessionStarted] = useState(false);
  const [currentFlowStep, setCurrentFlowStep] = useState<FlowStepId | null>(
    null,
  );
  const [guidedRunning, setGuidedRunning] = useState(false);
  const [guidedStatus, setGuidedStatus] = useState<string | null>(null);
  const [tipsOpen, setTipsOpen] = useState(
    () => sessionStorage.getItem(TIPS_KEY) !== "1",
  );

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
        setGraph(result.mode);
        setScenario(result.scenarioType);
        setMagnitude(result.magnitude);
        setWriteback(null);
        void refreshWriteback(result.assetId);
        void refreshTimeline();
        return result;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unknown replay error");
        throw cause;
      } finally {
        setLoading(false);
      }
    },
    [refreshWriteback, refreshTimeline],
  );

  useEffect(() => {
    let cancelled = false;

    Promise.all([getCapabilities(), getState()])
      .then(([caps, saved]) => {
        if (cancelled) {
          return;
        }
        setCapabilities(caps);
        if (saved) {
          setState(saved);
          setGraph(saved.mode);
          setScenario(saved.scenarioType);
          setMagnitude(saved.magnitude);
          setSessionStarted(true);
          void refreshWriteback(saved.assetId);
          void refreshTimeline();
        }
        setLoading(false);
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
  }, [refreshTimeline, refreshWriteback]);

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

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

  const runRecommended = () => {
    void execute("full", "RATE_SHOCK", 0.8);
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
      throw cause;
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
      throw cause;
    } finally {
      setWritebackLoading(false);
      setWritebackAction(null);
    }
  };

  const startSession = () => {
    setSessionStarted(true);
    setGuidedStatus(null);
  };

  const runGuidedDemo = async () => {
    setSessionStarted(true);
    setGuidedRunning(true);
    setGuidedStatus(null);
    setWritebackError(null);

    const canFull =
      capabilities?.features.onChainCommit && capabilities?.features.malecnsFull;

    try {
      setCurrentFlowStep("attest");
      setGuidedStatus("Steps 1–2: Attestcoin verify + MaleCNS replay…");
      const replay = canFull
        ? await execute("full", "RATE_SHOCK", 0.8)
        : await execute("demo", "RATE_SHOCK", 0.2);

      if (!replay) {
        throw new Error("Replay did not return a result.");
      }

      setCurrentFlowStep("replay");
      scrollToSection("section-pipeline");
      await delay(2500);

      if (!capabilities?.features.onChainCommit) {
        setGuidedStatus(
          capabilities?.message ??
            "Replay complete. Connect the full worker API for Commit and Relay.",
        );
        setCurrentFlowStep(null);
        return;
      }

      setCurrentFlowStep("commit");
      setGuidedStatus("Step 3: Commit decision to Counterfly ASC on CC3…");
      scrollToSection("section-writeback");
      await delay(800);
      setWritebackLoading(true);
      setWritebackAction("commit");
      try {
        await commitDecision(replay.assetId, replay.replayHash, replay.action);
        await refreshWriteback(replay.assetId);
        await refreshTimeline();
      } finally {
        setWritebackLoading(false);
        setWritebackAction(null);
      }

      setCurrentFlowStep("writeback");
      setGuidedStatus("Step 4: Relay cross-chain instruction to Sepolia…");
      await delay(800);
      setWritebackLoading(true);
      setWritebackAction("relay");
      try {
        await relayDecision(replay.assetId);
        await refreshWriteback(replay.assetId);
        await refreshTimeline();
      } finally {
        setWritebackLoading(false);
        setWritebackAction(null);
      }

      scrollToSection("section-timeline");
      setGuidedStatus(
        "Guided demo complete — open Blockscout / Etherscan links in the timeline.",
      );
      setCurrentFlowStep(null);
    } catch (cause) {
      setGuidedStatus(
        cause instanceof Error ? cause.message : "Guided demo stopped.",
      );
      setCurrentFlowStep(null);
    } finally {
      setGuidedRunning(false);
    }
  };

  const lastCommit = latestEventOfType(timeline, "commit");
  const lastRelay = latestEventOfType(timeline, "relay");
  const attested = Boolean(
    state?.attestation?.verified === true ||
      (state?.attestation?.skipped && state?.mode === "demo"),
  );

  const flowActive: Record<FlowStepId, boolean> = {
    attest: attested,
    replay: Boolean(state),
    commit: Boolean(writeback?.committed),
    writeback: Boolean(lastRelay?.txHash || writeback?.rwaLiquidated),
  };

  const dismissTips = () => {
    sessionStorage.setItem(TIPS_KEY, "1");
    setTipsOpen(false);
  };

  const pipelineLabel =
    capabilities?.pipeline === "full"
      ? "Full pipeline"
      : capabilities?.pipeline === "partial"
        ? "Partial pipeline"
        : "Replay-only";

  return (
    <main className="shell">
      {capabilities ? (
        <div
          className={`backend-banner backend-${capabilities.pipeline}`}
          role="status"
        >
          <strong>{pipelineLabel}</strong>
          <span>
            {capabilities.pipeline === "full"
              ? "Attestcoin verify · MaleCNS · CC3 commit · Sepolia relay"
              : capabilities.pipeline === "partial"
                ? "Live Attest + replay; commit/relay need worker keys on the API host."
                : "Deterministic demo replay only — set Vercel COUNTERFLY_API_ORIGIN to your worker :8786."}
          </span>
          {capabilities.message ? (
            <span className="backend-detail">{capabilities.message}</span>
          ) : null}
        </div>
      ) : null}

      <header className="hero">
        <div className="hero-copy">
          <img className="brand-logo" src="/logo.png" alt="Counterfly logo" />
          <p className="eyebrow">Counterfly</p>
          <h1>Don&apos;t trust the appraiser — reproduce the fly.</h1>
          <p className="lede">
            A reproducible counterfactual-history engine for RWA risk, powered
            by a fruit-fly connectome and Attestcoin-verified cross-chain data.
          </p>
        </div>
        <CyberFly action={state?.action ?? 0} />
      </header>

      {tipsOpen ? (
        <aside className="tips-banner" aria-label="Quick tips">
          <div className="tips-copy">
            {QUICK_TIPS.map((tip) => (
              <p key={tip}>{tip}</p>
            ))}
          </div>
          <button type="button" className="tips-dismiss" onClick={dismissTips}>
            Got it
          </button>
        </aside>
      ) : null}

      <section className="flow-strip" aria-label="Pipeline">
        {FLOW_STEPS.map((step, index) => {
          const isCurrent = currentFlowStep === step.id;
          return (
            <button
              type="button"
              key={step.id}
              className={`flow-step flow-step-btn ${isCurrent ? "current" : ""} ${
                flowActive[step.id] ? "done" : ""
              }`}
              onClick={() => {
                setCurrentFlowStep(step.id);
                scrollToSection(step.sectionId);
              }}
              title={step.hint}
            >
              <span
                className={`flow-node ${flowActive[step.id] || isCurrent ? "active" : ""}`}
              >
                {index + 1}
              </span>
              <span className="flow-label">{step.label}</span>
              {index < FLOW_STEPS.length - 1 ? (
                <span className="flow-link" aria-hidden />
              ) : null}
            </button>
          );
        })}
      </section>

      {currentFlowStep ? (
        <p className="flow-hint">
          {FLOW_STEPS.find((s) => s.id === currentFlowStep)?.hint}
        </p>
      ) : null}

      {guidedStatus ? (
        <p className="guided-status" role="status">
          {guidedStatus}
        </p>
      ) : null}

      {!sessionStarted && !loading ? (
        <section className="start-panel">
          <h2>Interactive demo</h2>
          <p>
            Walk through Attestcoin readability, connectome replay, ASC commit,
            and Sepolia write-back — or explore scenarios manually.
          </p>
          <div className="start-actions">
            <button
              type="button"
              className="run guided-primary"
              onClick={() => void runGuidedDemo()}
              disabled={guidedRunning}
            >
              {guidedRunning ? "Guided demo running…" : "Guided demo (4 steps)"}
            </button>
            <button
              type="button"
              className="guided-secondary"
              onClick={startSession}
              disabled={guidedRunning}
            >
              Start manual demo
            </button>
          </div>
        </section>
      ) : null}

      {sessionStarted ? (
        <section className="controls">
          <div className="control-group">
            <span className="control-label">Brain</span>
            <div className="segmented">
              <button
                className={graph === "demo" ? "active" : ""}
                onClick={() => chooseGraph("demo")}
                disabled={loading || guidedRunning}
              >
                Demo brain
              </button>
              <button
                className={graph === "full" ? "active" : ""}
                onClick={() => chooseGraph("full")}
                disabled={loading || guidedRunning}
                title={
                  capabilities?.features.malecnsFull
                    ? undefined
                    : "Requires worker with MaleCNS data prepared"
                }
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
                  disabled={loading || guidedRunning}
                  title={SCENARIO_RWA_HINT[item]}
                >
                  {SCENARIO_LABELS[item]}
                </button>
              ))}
            </div>
            <p className="scenario-hint">{SCENARIO_RWA_HINT[scenario]}</p>
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
              disabled={loading || guidedRunning}
            />
            <button className="run" onClick={submit} disabled={loading || guidedRunning}>
              {loading ? "Replaying…" : "Run replay"}
            </button>
          </div>

          <div className="control-group recommended-group">
            <button
              className="recommended"
              onClick={runRecommended}
              disabled={loading || guidedRunning}
            >
              {loading
                ? "Running…"
                : "Recommended · MaleCNS v1.0 · RATE_SHOCK 0.8"}
            </button>
            <button
              type="button"
              className="guided-inline"
              onClick={() => void runGuidedDemo()}
              disabled={loading || guidedRunning}
            >
              {guidedRunning ? "Guided…" : "Re-run guided demo"}
            </button>
          </div>
        </section>
      ) : null}

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
          <section className="grid" id="section-pipeline">
            <Panel
              title="1 · Attest"
              subtitle="Attestcoin ProofBuilder + BlockProver"
              items={[
                [
                  "Verify",
                  state.attestation?.verified
                    ? `verified (header ${state.attestation.headerNumber ?? "—"})`
                    : state.attestation?.skipped
                      ? "demo tx (skipped)"
                      : state.attestation?.error ?? "pending",
                ],
                ["Payment tx", shortHash(state.sourceEvent.txHash)],
                ["Sepolia block", String(state.sourceEvent.blockNumber)],
                ["RWA case", state.rwaTitle ?? "—"],
                ["Brain", state.mode === "full" ? "MaleCNS v1.0" : "Demo brain"],
              ]}
              highlight={
                state.attestation?.verified ? "Attestcoin OK" : undefined
              }
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

          <section className="writeback" id="section-writeback">
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

              {!capabilities?.features.onChainCommit ? (
                <p className="writeback-note">
                  Commit and relay require the full worker API with{" "}
                  <code>PRIVATE_KEY</code> and ASC addresses configured.
                </p>
              ) : null}

              <div className="writeback-actions">
                <button
                  className="run"
                  onClick={() => void commit()}
                  disabled={
                    writebackLoading || !state || !capabilities?.features.onChainCommit
                  }
                >
                  {writebackAction === "commit"
                    ? "Committing…"
                    : "Commit to CC3"}
                </button>
                <button
                  onClick={() => void relay()}
                  disabled={
                    writebackLoading ||
                    !writeback?.committed ||
                    !state ||
                    !capabilities?.features.onChainRelay
                  }
                >
                  {writebackAction === "relay"
                    ? "Relaying…"
                    : "Relay to Sepolia"}
                </button>
              </div>
            </div>
          </section>

          <section className="timeline" id="section-timeline">
            <div className="panel-head">
              <h2>5 · Event timeline</h2>
              <span>Attest → Replay → Commit → Relay</span>
            </div>

            {timeline.length === 0 ? (
              <p className="timeline-empty">
                No events yet — run the guided demo or commit manually.
              </p>
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
              Same graph + same scenario + same seed = same decision. See{" "}
              <code>docs/REPRODUCE.md</code>, run{" "}
              <code>npm run demo -w @counterfly/worker</code>, or POST{" "}
              <code>/api/run</code> with identical parameters. Live Attestcoin
              verify: <code>GET /api/attest?txHash=0x…</code>.
            </span>
          </footer>
        </>
      ) : sessionStarted && !loading ? (
        <section className="start-panel start-panel-compact">
          <p>Choose a scenario above or run the guided demo to populate results.</p>
        </section>
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
