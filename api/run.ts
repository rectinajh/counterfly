import { cloudDemoRun, type CloudRunRequest } from "../lib/cloud-demo";

export default function handler(req: any, res: any) {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  try {
    const body = (req.body || {}) as CloudRunRequest;
    res.status(200).json(cloudDemoRun(body));
  } catch (error) {
    const message = error instanceof Error ? error.message : "replay failed";
    const status =
      (error as Error & { status?: number }).status ?? 500;
    res.status(status).json({ error: message });
  }
}

function setCors(res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
}
