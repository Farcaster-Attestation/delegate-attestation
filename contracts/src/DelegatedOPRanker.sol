// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Multicall} from "@openzeppelin/contracts/utils/Multicall.sol";

bytes32 constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

interface IDelegatedOP {
    function getVotes(address account) external view returns (uint256);
}

contract DelegatedOPRanker is AccessControl, Multicall {
    // The DelegatedOP contract address
    address public immutable delegatedOP;

    // Maximum number of ranks
    uint256 public immutable maxRanks;

    // Thresholds for each rank (index 0 = rank 1, index 1 = rank 2, etc.)
    address[] public ranks;

    event RankUpdated(
        address indexed account,
        uint256 oldRank,
        uint256 newRank
    );

    constructor(address _delegatedOP, uint256 _maxRanks) {
        delegatedOP = _delegatedOP;
        maxRanks = _maxRanks;
    }
}
