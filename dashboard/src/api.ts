import type { GraphMode, ReplayState, ScenarioType } from "./types";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "http://localhost:8787";

export interface RunRequest {
  graph: GraphMode;
  scenario: ScenarioType;
  magnitude: number;
}

export async function runReplay(request: RunRequest): Promise<ReplayState> {
  const response = await fetch(`${API_BASE}/api/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      body && typeof body.error === "string"
        ? body.error
        : `Replay failed with status ${response.status}`;
    throw new Error(message);
  }

  return (await response.json()) as ReplayState;
}

export async function getState(): Promise<ReplayState | null> {
  const response = await fetch(`${API_BASE}/api/state`);

  if (!response.ok) {
    throw new Error(`Could not read state (${response.status})`);
  }

  return (await response.json()) as ReplayState | null;
}
