// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { INativeQueryVerifier } from "./INativeQueryVerifier.sol";

/// @notice Attestcoin Smart Contract that records reproducible Counterfly risk decisions.
contract CounterflyASC is EIP712 {
    using ECDSA for bytes32;

    address public constant BLOCK_PROVER = 0x0000000000000000000000000000000000000FD2;

    bytes32 private constant SCENARIO_TYPEHASH = keccak256(
        "Scenario(bytes32 assetId,bytes32 historyMerkleRoot,bytes32 scenarioHash,uint256 timestamp,bytes32 verifiedSourceTx)"
    );

    bytes32 private constant DECISION_TYPEHASH = keccak256(
        "Decision(bytes32 assetId,bytes32 replayHash,uint8 action,uint256 newLtvBps,uint256 nonce)"
    );

    struct Scenario {
        bytes32 assetId;
        bytes32 historyMerkleRoot;
        bytes32 scenarioHash;
        uint256 timestamp;
        bytes32 verifiedSourceTx;
    }

    struct Decision {
        bytes32 assetId;
        bytes32 replayHash;
        uint8 action;
        uint256 newLtvBps;
        uint256 nonce;
    }

    address public immutable worker;

    mapping(bytes32 => Scenario) public scenarios;
    mapping(bytes32 => Decision) public latestDecisions;

    event ScenarioSubmitted(bytes32 indexed assetId, bytes32 scenarioHash, bytes32 verifiedSourceTx);
    event DecisionCommitted(bytes32 indexed assetId, bytes32 replayHash, uint8 action);
    event SourceVerifiedOnChain(bytes32 indexed assetId, uint256 chainKey, uint256 headerNumber);

    constructor(address worker_) EIP712("CounterflyASC", "1") {
        require(worker_ != address(0), "zero worker");
        worker = worker_;
    }

    modifier onlyWorker() {
        require(msg.sender == worker, "not worker");
        _;
    }

    /// @notice Worker registers an Attestcoin-verified Sepolia tx hash before scenario commit.
    function registerVerifiedSource(bytes32 assetId, bytes32 verifiedSourceTx) external onlyWorker {
        require(verifiedSourceTx != bytes32(0), "zero source tx");
        Scenario storage s = scenarios[assetId];
        require(s.scenarioHash == bytes32(0), "scenario exists");
        s.assetId = assetId;
        s.verifiedSourceTx = verifiedSourceTx;
    }

    /// @notice Optional on-chain readability path using the BlockProver precompile.
    function verifySourceAndRegister(
        bytes32 assetId,
        uint256 chainKey,
        uint256 headerNumber,
        bytes calldata txBytes,
        INativeQueryVerifier.MerkleProof calldata merkleProof,
        INativeQueryVerifier.ContinuityProof calldata continuityProof
    ) external onlyWorker {
        bool ok = INativeQueryVerifier(BLOCK_PROVER).verifyAndEmit(
            chainKey,
            headerNumber,
            txBytes,
            merkleProof,
            continuityProof
        );
        require(ok, "proof verify failed");

        bytes32 sourceTx = keccak256(txBytes);
        Scenario storage s = scenarios[assetId];
        require(s.scenarioHash == bytes32(0), "scenario exists");
        s.assetId = assetId;
        s.verifiedSourceTx = sourceTx;
        emit SourceVerifiedOnChain(assetId, chainKey, headerNumber);
    }

    function submitScenario(Scenario calldata s) external onlyWorker {
        require(s.timestamp <= block.timestamp + 5 minutes, "future timestamp");
        require(s.verifiedSourceTx != bytes32(0), "source not verified");
        scenarios[s.assetId] = s;
        emit ScenarioSubmitted(s.assetId, s.scenarioHash, s.verifiedSourceTx);
    }

    function commitDecision(Decision calldata d, bytes calldata signature) external {
        Scenario memory scenario = scenarios[d.assetId];
        require(scenario.scenarioHash != bytes32(0), "scenario missing");
        require(scenario.verifiedSourceTx != bytes32(0), "source missing");

        bytes32 structHash = keccak256(
            abi.encode(DECISION_TYPEHASH, d.assetId, d.replayHash, d.action, d.newLtvBps, d.nonce)
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = digest.recover(signature);
        require(signer == worker, "invalid signature");

        latestDecisions[d.assetId] = d;
        emit DecisionCommitted(d.assetId, d.replayHash, d.action);
    }

    function latestDecision(bytes32 assetId) external view returns (Decision memory) {
        return latestDecisions[assetId];
    }
}
