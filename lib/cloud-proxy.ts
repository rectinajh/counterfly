import {
  cloudAttestStatus,
  cloudCapabilities,
  cloudDemoRun,
  cloudWritebackStatus,
} from "./cloud-demo";

const BACKEND_ORIGIN =
  process.env.COUNTERFLY_API_ORIGIN || "http://144.91.75.120:8786";

export async function proxyApi(req: any, res: any) {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const pathname = new URL(req.url || "/", "http://localhost").pathname;
  const target = `${BACKEND_ORIGIN}${req.url}`;
  const timeoutMs = pathname === "/api/run" ? 120000 : 8000;

  try {
    const upstream = await withTimeout(
      fetch(target, {
        method: req.method,
        headers: {
          accept: "application/json",
          ...(req.body ? { "content-type": "application/json" } : {}),
        },
        body: req.body ? JSON.stringify(req.body) : undefined,
      }),
      timeoutMs,
    );

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader(
      "content-type",
      upstream.headers.get("content-type") || "application/json",
    );
    res.send(text);
  } catch {
    fallback(req, res);
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function fallback(req: any, res: any) {
  const pathname = new URL(req.url || "/", "http://localhost").pathname;

  if (req.method === "POST" && pathname === "/api/run") {
    res.status(200).json(cloudDemoRun(req.body || {}));
    return;
  }

  if (req.method === "GET" && pathname === "/api/state") {
    res.status(200).json(null);
    return;
  }

  if (req.method === "GET" && pathname === "/api/writeback") {
    const assetId =
      typeof req.query.assetId === "string" ? req.query.assetId : null;
    res.status(200).json(cloudWritebackStatus(assetId));
    return;
  }

  if (req.method === "GET" && pathname === "/api/timeline") {
    res.status(200).json({ events: [] });
    return;
  }

  if (req.method === "GET" && pathname === "/api/attest") {
    res.status(200).json(cloudAttestStatus());
    return;
  }

  if (req.method === "GET" && pathname === "/api/capabilities") {
    res.status(200).json(cloudCapabilities());
    return;
  }

  if (pathname === "/api/commit" || pathname === "/api/relay") {
    res.status(501).json({
      error:
        "Full backend is unreachable. Open TCP 8786 to Vercel, then retry.",
    });
    return;
  }

  res.status(502).json({ error: "Backend worker is unreachable." });
}

function setCors(res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
}
