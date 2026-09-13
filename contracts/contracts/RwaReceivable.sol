// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal Sepolia source contract for invoice-style RWA cash-flow events.
/// @dev Attestcoin readability verifies the containing transaction on Creditcoin CC3.
contract RwaReceivable {
    bytes32 public immutable assetId;

    event InvoicePayment(
        bytes32 indexed assetId,
        uint256 periodIndex,
        uint256 amount,
        uint256 daysLate
    );

    constructor(bytes32 assetId_) {
        require(assetId_ != bytes32(0), "zero asset");
        assetId = assetId_;
    }

    function recordPayment(uint256 periodIndex, uint256 amount, uint256 daysLate) external {
        emit InvoicePayment(assetId, periodIndex, amount, daysLate);
    }
}
