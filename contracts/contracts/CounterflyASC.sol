// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @notice Attestcoin Smart Contract that records reproducible Counterfly risk decisions.
contract CounterflyASC is EIP712 {
    using ECDSA for bytes32;

    bytes32 private constant SCENARIO_TYPEHASH = keccak256(
        "Scenario(bytes32 assetId,bytes32 historyMerkleRoot,bytes32 scenarioHash,uint256 timestamp)"
    );

    bytes32 private constant DECISION_TYPEHASH = keccak256(
        "Decision(bytes32 assetId,bytes32 replayHash,uint8 action,uint256 newLtvBps,uint256 nonce)"
    );

    struct Scenario {
        bytes32 assetId;
        bytes32 historyMerkleRoot;
        bytes32 scenarioHash;
        uint256 timestamp;
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

    event ScenarioSubmitted(bytes32 indexed assetId, bytes32 scenarioHash);
    event DecisionCommitted(bytes32 indexed assetId, bytes32 replayHash, uint8 action);

    constructor(address worker_) EIP712("CounterflyASC", "1") {
        require(worker_ != address(0), "zero worker");
        worker = worker_;
    }

    function submitScenario(Scenario calldata s) external {
        require(s.timestamp <= block.timestamp + 5 minutes, "future timestamp");
        scenarios[s.assetId] = s;
        emit ScenarioSubmitted(s.assetId, s.scenarioHash);
    }

    function commitDecision(Decision calldata d, bytes calldata signature) external {
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
