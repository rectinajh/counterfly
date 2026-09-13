// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Target-chain action contract. In production this would be the
/// RWA vault; in the hackathon demo it demonstrates the Attestcoin writability path.
contract RwaAction {
    address public immutable relayer;

    mapping(bytes32 => uint256) public ltvBps;
    mapping(bytes32 => bool) public liquidated;

    event LtvAdjusted(bytes32 indexed assetId, uint256 newLtvBps);
    event LiquidationRequested(bytes32 indexed assetId);

    constructor(address relayer_) {
        require(relayer_ != address(0), "zero relayer");
        relayer = relayer_;
    }

    modifier onlyRelayer() {
        require(msg.sender == relayer, "not relayer");
        _;
    }

    function adjustLtv(bytes32 assetId, uint256 newLtvBps) external onlyRelayer {
        require(newLtvBps <= 10000, "invalid bps");
        ltvBps[assetId] = newLtvBps;
        emit LtvAdjusted(assetId, newLtvBps);
    }

    function requestLiquidation(bytes32 assetId) external onlyRelayer {
        require(!liquidated[assetId], "already liquidated");
        liquidated[assetId] = true;
        emit LiquidationRequested(assetId);
    }
}
