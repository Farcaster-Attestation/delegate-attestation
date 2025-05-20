// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IAlligatorOP} from "optimism-governor/src/interfaces/IAlligatorOP.sol";

enum DelegateStatus {
    NORMAL,
    PROXY,
    REDUCED,
    BANNED
}

interface IDelegatedOP {
    event SubDelegationRuleUpdated(
        address indexed from,
        address indexed to,
        uint256 amount
    );

    event OverDelegationReduced(
        address indexed from,
        address indexed to,
        uint256 amount
    );

    function status(address account) external view returns (DelegateStatus);

    function subDelegationFrom(address account) external view returns (uint256);
    function subDelegationTo(address account) external view returns (uint256);
    function subDelegations(
        address from,
        address to
    ) external view returns (uint256);
    function getNativeDelegation(
        address account
    ) external view returns (uint256);
    function getVotes(address account) external view returns (uint256);
    function getProxyDelegatedVotes(
        address account
    ) external view returns (uint256);
    function getRuleDelegation(
        uint32 notValidBefore,
        uint32 notValidAfter,
        IAlligatorOP.AllowanceType allowanceType,
        uint256 allowance,
        uint256 totalVotes
    ) external view returns (uint256);
    function reduceOverDelegation(address from, address to) external;
    function updateSubDelegationRule(address from, address to) external;
}
