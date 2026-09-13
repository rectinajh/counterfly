import type {
  GraphMode,
  ReplayState,
  ScenarioType,
  TimelineEvent,
  WritebackStatus,
} from "./types";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "http://localhost:8787";

export interface RunRequest {
  graph: GraphMode;
  scenario: ScenarioType;
  magnitude: number;
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    const message =
      body && typeof body.error === "string"
        ? body.error
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function runReplay(request: RunRequest): Promise<ReplayState> {
  const response = await fetch(`${API_BASE}/api/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });

  return readJson<ReplayState>(response);
}

export async function getState(): Promise<ReplayState | null> {
  const response = await fetch(`${API_BASE}/api/state`);

  if (!response.ok) {
    throw new Error(`Could not read state (${response.status})`);
  }

  return (await response.json()) as ReplayState | null;
}

export async function getWriteback(
  assetId: string,
): Promise<WritebackStatus> {
  const response = await fetch(
    `${API_BASE}/api/writeback?assetId=${encodeURIComponent(assetId)}`,
  );
  return readJson<WritebackStatus>(response);
}

export async function getTimeline(): Promise<TimelineEvent[]> {
  const response = await fetch(`${API_BASE}/api/timeline`);
  const body = await readJson<{ events: TimelineEvent[] }>(response);
  return body.events;
}

export async function commitDecision(
  assetId: string,
  replayHash: string,
  action: number,
): Promise<{ txHash: string; newLtvBps: string }> {
  const response = await fetch(`${API_BASE}/api/commit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ assetId, replayHash, action }),
  });
  return readJson<{ txHash: string; newLtvBps: string }>(response);
}

export async function relayDecision(
  assetId: string,
): Promise<{ txHash?: string; action: number; newLtvBps: string }> {
  const response = await fetch(`${API_BASE}/api/relay`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ assetId }),
  });
  return readJson<{
    txHash?: string;
    action: number;
    newLtvBps: string;
  }>(response);
}
