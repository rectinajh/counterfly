import { existsSync } from "node:fs";
import path from "node:path";
import { hasWriteConfig } from "./writeback";

export interface PipelineCapabilities {
  source: "worker";
  pipeline: "full" | "partial";
  features: {
    liveAttest: boolean;
    malecnsFull: boolean;
    onChainCommit: boolean;
    onChainRelay: boolean;
  };
  message?: string;
}

export function getPipelineCapabilities(): PipelineCapabilities {
  const metaPath = path.resolve(__dirname, "../fly/data/malecns_v1.meta.json");
  const malecnsFull = existsSync(metaPath);

  const onChain = hasWriteConfig();
  return {
    source: "worker",
    pipeline: onChain ? "full" : "partial",
    features: {
      liveAttest: true,
      malecnsFull,
      onChainCommit: onChain,
      onChainRelay: onChain,
    },
    message: onChain
      ? undefined
      : "Worker replay + Attestcoin verify are live; set PRIVATE_KEY and contract addresses for commit/relay.",
  };
}
