import { JsonRpcProvider } from "ethers";
import { blockProver, proofProvider } from "@gluwa/usc-sdk";
import { config } from "./config";

export interface VerifiedEvent {
  txHash: string;
  blockNumber: number;
  chainKey: number;
  eventType: "PAYMENT";
}

export interface AttestationResult {
  event: VerifiedEvent;
  verified: boolean;
  headerNumber?: number;
  skipped?: boolean;
  error?: string;
}

const cache = new Map<string, AttestationResult>();

function shouldSkipAttest(txHash: string): boolean {
  if (process.env.SKIP_ATTEST === "true") {
    return true;
  }
  // Synthetic demo tx cannot be attested on-chain.
  return txHash === `0x${"a".repeat(64)}`;
}

/**
 * Verifies a source-chain (Ethereum Sepolia) RWA payment event on Creditcoin
 * using the Attestcoin Protocol proof-builder service and BlockProver precompile.
 */
export async function verifySepoliaEvent(txHash: string): Promise<VerifiedEvent> {
  const result = await attestSepoliaEvent(txHash);
  if (!result.verified && !result.skipped) {
    throw new Error(result.error ?? "attestation failed");
  }
  return result.event;
}

export async function attestSepoliaEvent(txHash: string): Promise<AttestationResult> {
  const cached = cache.get(txHash.toLowerCase());
  if (cached) {
    return cached;
  }

  const event: VerifiedEvent = {
    txHash,
    blockNumber: 0,
    chainKey: config.chainKey,
    eventType: "PAYMENT",
  };

  if (shouldSkipAttest(txHash)) {
    const skipped: AttestationResult = {
      event: {
        ...event,
        blockNumber: 12345678,
      },
      verified: false,
      skipped: true,
      error: "Synthetic demo transaction; Attestcoin verify skipped.",
    };
    cache.set(txHash.toLowerCase(), skipped);
    return skipped;
  }

  try {
    const sourceProvider = new JsonRpcProvider(config.sepoliaRpc);
    const creditcoinProvider = new JsonRpcProvider(config.cc3Rpc);

    const prover = new blockProver.PrecompileBlockProver(creditcoinProvider);
    const proofBuilder = new proofProvider.service.ProofBuilder(
      config.chainKey,
      config.proverEndpoint,
    );

    const tx = await sourceProvider.getTransaction(txHash);
    if (!tx || tx.blockNumber == null) {
      throw new Error(`transaction not found on source chain: ${txHash}`);
    }

    event.blockNumber = tx.blockNumber;

    await proofBuilder.waitUntilHeightAttested(config.chainKey, tx.blockNumber);

    const result = await proofBuilder.getProof(txHash);
    if (!result.success || !result.data) {
      throw new Error(result.error ?? "proof generation failed");
    }

    const verified = await prover.verifySingle(
      result.data.chainKey,
      result.data.headerNumber,
      result.data.txBytes,
      result.data.merkleProof,
      result.data.continuityProof,
    );

    if (!verified) {
      throw new Error("on-chain verification failed");
    }

    const attested: AttestationResult = {
      event,
      verified: true,
      headerNumber: result.data.headerNumber,
    };
    cache.set(txHash.toLowerCase(), attested);
    return attested;
  } catch (error) {
    const failed: AttestationResult = {
      event,
      verified: false,
      error: error instanceof Error ? error.message : "attestation failed",
    };
    return failed;
  }
}
