import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("CounterflyASC", function () {
  let worker: SignerWithAddress;
  let stranger: SignerWithAddress;

  const assetId = ethers.id("counterfly-demo-asset");
  const historyMerkleRoot = ethers.id("history-root");
  const scenarioHash = ethers.id("scenario");
  const replayHash = ethers.id("replay");
  const verifiedSourceTx = ethers.id("sepolia-payment-tx");

  beforeEach(async function () {
    [worker, stranger] = await ethers.getSigners();
  });

  async function deploy() {
    const factory = await ethers.getContractFactory("CounterflyASC");
    const asc = await factory.deploy(worker.address);
    await asc.waitForDeployment();
    return asc;
  }

  async function signDecision(
    asc: Awaited<ReturnType<typeof deploy>>,
    signer: SignerWithAddress,
    value: {
      assetId: string;
      replayHash: string;
      action: number;
      newLtvBps: bigint;
      nonce: bigint;
    },
  ) {
    const domain = {
      name: "CounterflyASC",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await asc.getAddress(),
    };

    const types = {
      Decision: [
        { name: "assetId", type: "bytes32" },
        { name: "replayHash", type: "bytes32" },
        { name: "action", type: "uint8" },
        { name: "newLtvBps", type: "uint256" },
        { name: "nonce", type: "uint256" },
      ],
    };

    return signer.signTypedData(domain, types, value);
  }

  async function seedScenario(asc: Awaited<ReturnType<typeof deploy>>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workerAsc = asc.connect(worker) as any;
    await workerAsc.registerVerifiedSource(assetId, verifiedSourceTx);
    await workerAsc.submitScenario({
      assetId,
      historyMerkleRoot,
      scenarioHash,
      timestamp: BigInt(Math.floor(Date.now() / 1000)),
      verifiedSourceTx,
    });
  }

  it("commits a validly signed decision after scenario submit", async function () {
    const asc = await deploy();
    await seedScenario(asc);

    const decision = {
      assetId,
      replayHash,
      action: 1,
      newLtvBps: 6000n,
      nonce: 0n,
    };

    const signature = await signDecision(asc, worker, decision);

    await expect(asc.commitDecision(decision, signature))
      .to.emit(asc, "DecisionCommitted")
      .withArgs(assetId, replayHash, 1);

    const stored = await asc.latestDecision(assetId);
    expect(stored.replayHash).to.equal(replayHash);
    expect(stored.newLtvBps).to.equal(6000n);
  });

  it("rejects a decision when scenario is missing", async function () {
    const asc = await deploy();

    const decision = {
      assetId,
      replayHash,
      action: 1,
      newLtvBps: 6000n,
      nonce: 0n,
    };

    const signature = await signDecision(asc, worker, decision);
    await expect(asc.commitDecision(decision, signature)).to.be.revertedWith(
      "scenario missing",
    );
  });

  it("rejects a decision signed by a non-worker", async function () {
    const asc = await deploy();
    await seedScenario(asc);

    const decision = {
      assetId,
      replayHash,
      action: 2,
      newLtvBps: 0n,
      nonce: 1n,
    };

    const signature = await signDecision(asc, stranger, decision);

    await expect(asc.commitDecision(decision, signature)).to.be.revertedWith("invalid signature");
  });

  it("rejects scenario submit from a non-worker", async function () {
    const asc = await deploy();
    await expect(
      (asc.connect(stranger) as any).submitScenario({
        assetId,
        historyMerkleRoot,
        scenarioHash,
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
        verifiedSourceTx,
      }),
    ).to.be.revertedWith("not worker");
  });
});
