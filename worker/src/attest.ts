import { JsonRpcProvider } from "ethers";
import { blockProver, proofProvider } from "@gluwa/usc-sdk";
import { config } from "./config";

export interface VerifiedEvent {
  txHash: string;
  blockNumber: number;
  chainKey: number;
  eventType: "PAYMENT";
}

/**
 * Verifies a source-chain (Ethereum Sepolia) RWA payment event on Creditcoin
 * using the Attestcoin Protocol proof-builder service and BlockProver precompile.
 */
export async function verifySepoliaEvent(txHash: string): Promise<VerifiedEvent> {
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

  return {
    txHash,
    blockNumber: tx.blockNumber,
    chainKey: config.chainKey,
    eventType: "PAYMENT",
  };
}
