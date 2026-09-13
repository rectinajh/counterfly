// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Creditcoin Native Query Verifier (BlockProver) precompile at 0x0FD2.
/// @dev See https://docs.creditcoin.org for Attestcoin readability primitives.
interface INativeQueryVerifier {
    struct MerkleProofEntry {
        bytes32 hash;
        bool isLeft;
    }

    struct MerkleProof {
        bytes32 root;
        MerkleProofEntry[] siblings;
    }

    struct ContinuityProof {
        uint256 startBlock;
        bytes32[] digests;
    }

    function verify(
        uint256 chainKey,
        uint256 headerNumber,
        bytes calldata txBytes,
        MerkleProof calldata merkleProof,
        ContinuityProof calldata continuityProof
    ) external view returns (bool);

    function verifyAndEmit(
        uint256 chainKey,
        uint256 headerNumber,
        bytes calldata txBytes,
        MerkleProof calldata merkleProof,
        ContinuityProof calldata continuityProof
    ) external returns (bool);
}
