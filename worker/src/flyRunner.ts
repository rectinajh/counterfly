import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);

const FLY_DIR = path.resolve(__dirname, "../fly");
const VENV_PYTHON = path.join(FLY_DIR, ".venv", "bin", "python");
const PYTHON = existsSync(VENV_PYTHON) ? VENV_PYTHON : "python3";

export interface FlyOutput {
  graphHash: string;
  scenarioHash: string;
  motorAxis: number;
  action: number;
  replayHash: string;
}

export async function runFly(
  scenario: unknown,
  seed = 0,
  graph = "demo",
): Promise<FlyOutput> {
  const script = path.resolve(__dirname, "../fly/engine.py");
  const tmp = path.join(
    tmpdir(),
    `counterfly-scenario-${Date.now()}-${Math.random().toString(36).slice(2)}.json`,
  );

  await writeFile(tmp, JSON.stringify(scenario), "utf8");

  try {
    const { stdout, stderr } = await execFileAsync(
      PYTHON,
      [script, "--scenario", tmp, "--graph", graph, "--seed", String(seed)],
      { cwd: path.resolve(__dirname, ".."), maxBuffer: 16 * 1024 * 1024 },
    );

    if (stderr) {
      console.error(stderr);
    }

    return JSON.parse(stdout) as FlyOutput;
  } finally {
    await rm(tmp, { force: true });
  }
}
