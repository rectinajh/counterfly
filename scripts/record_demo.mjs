#!/usr/bin/env node
/**
 * Records docs/Counterfly-Demo.mp4 using Playwright (1920x1080).
 * Default target: https://counterfly.vercel.app (override with DEMO_DASHBOARD_URL).
 * Requires: `npx playwright install chromium`, ffmpeg, macOS `say` for narration.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "docs", "video-assets", "capture");
const OUT_VIDEO = path.join(ROOT, "docs", "Counterfly-Demo.mp4");
const DASHBOARD =
  process.env.DEMO_DASHBOARD_URL || "https://counterfly.vercel.app";
const SEPOLIA_TX =
  "https://sepolia.etherscan.io/tx/0xfcb1d4277b56b03ed2e0fb536f5ec32f26abcc6e149a00f9bb3c729750b1afba";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const { chromium } = await import("playwright");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: OUT_DIR, size: { width: 1920, height: 1080 } },
    colorScheme: "dark",
  });
  const page = await context.newPage();

  const titleUrl = `file://${path.join(ROOT, "docs/video-assets/title.html")}`;
  const endUrl = `file://${path.join(ROOT, "docs/video-assets/end.html")}`;

  console.log("Scene 1: title");
  await page.goto(titleUrl);
  await sleep(9000);

  console.log("Scene 2: Etherscan");
  await page.goto(SEPOLIA_TX, { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(14000);

  console.log("Scene 3: dashboard at", DASHBOARD);
  await page.goto(DASHBOARD, { waitUntil: "load", timeout: 120000 });
  await sleep(5000);

  const guided = page.getByRole("button", { name: /Guided demo \(4 steps\)/i });
  if (await guided.isVisible().catch(() => false)) {
    console.log("Running guided demo…");
    await guided.click();
    await page
      .locator("text=/Guided demo complete|Replay complete|Step 3|Step 4/")
      .first()
      .waitFor({ timeout: 120000 })
      .catch(() => {});
    await sleep(12000);
  } else {
    const recommended = page.getByRole("button", { name: /Recommended/i });
    if (await recommended.isVisible().catch(() => false)) {
      await recommended.click();
      await sleep(20000);
    }
  }

  await page.evaluate(() => window.scrollBy(0, 600));
  await sleep(5000);

  console.log("Scene 5: end card");
  await page.goto(endUrl);
  await sleep(8000);

  await context.close();
  await browser.close();

  const webm = readdirSync(OUT_DIR).find((f) => f.endsWith(".webm"));
  if (!webm) {
    throw new Error("No Playwright video file found");
  }
  const rawWebm = path.join(OUT_DIR, webm);
  const rawMp4 = path.join(OUT_DIR, "raw.mp4");

  console.log("Encoding video…");
  const enc = spawnSync(
    "ffmpeg",
    ["-y", "-i", rawWebm, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23", rawMp4],
    { stdio: "inherit" },
  );
  if (enc.status !== 0) {
    throw new Error("ffmpeg encode failed");
  }

  const narrationPath = path.join(OUT_DIR, "narration.aiff");
  const narrationMp3 = path.join(OUT_DIR, "narration.mp3");
  const script = [
    "Counterfly replaces the centralized RWA appraiser with a reproducible fruit-fly connectome and Attestcoin-verified cross-chain data.",
    "We start with a real payment on Ethereum Sepolia.",
    "Attestcoin ProofBuilder and BlockProver verify it on Creditcoin CC3.",
    "The dashboard replays attested history and counterfactual scenarios through the connectome.",
    "The motor readout maps to hold, adjust L T V, or liquidate.",
    "Every replay is hash-pinned.",
    "Decisions commit to the Counterfly Smart Contract on CC3, then write back to Sepolia.",
    "Built for BUIDL CTC 2026. Do not trust the appraiser. Reproduce the fly.",
  ].join(" ");

  console.log("Generating narration…");
  spawnSync("say", ["-v", "Samantha", "-r", "108", script, "-o", narrationPath], {
    stdio: "inherit",
  });
  spawnSync(
    "ffmpeg",
    ["-y", "-i", narrationPath, "-codec:a", "libmp3lame", "-qscale:a", "4", narrationMp3],
    { stdio: "inherit" },
  );

  const videoDur = Number(
    spawnSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", rawMp4],
      { encoding: "utf8" },
    ).stdout.trim(),
  );

  console.log("Muxing final demo (~%ss)…", Math.round(videoDur));
  const mux = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      rawMp4,
      "-i",
      narrationMp3,
      "-filter_complex",
      `[1:a]apad=whole_dur=${videoDur.toFixed(3)}[a]`,
      "-map",
      "0:v:0",
      "-map",
      "[a]",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      OUT_VIDEO,
    ],
    { stdio: "inherit" },
  );
  if (mux.status !== 0) {
    renameSync(rawMp4, OUT_VIDEO);
    console.warn("Mux failed; saved silent video to", OUT_VIDEO);
  } else {
    console.log("Wrote", OUT_VIDEO, statSync(OUT_VIDEO).size, "bytes");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
