// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IVotes} from "./IVotes.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {IAlligatorOP} from "optimism-governor/src/interfaces/IAlligatorOP.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Multicall} from "@openzeppelin/contracts/utils/Multicall.sol";

address constant OP_ADDRESS = 0x4200000000000000000000000000000000000042;
address constant ALIGATOR_ADDRESS = 0x7f08F3095530B67CdF8466B7a923607944136Df0;

bytes32 constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

interface IAlligatorOPSubdelegation {
    function subdelegations(
        address from,
        address to
    )
        external
        view
        returns (
            uint8 maxRedelegations,
            uint16 blocksBeforeVoteCloses,
            uint32 notValidBefore,
            uint32 notValidAfter,
            address customRule,
            IAlligatorOP.AllowanceType allowanceType,
            uint256 allowance
        );
}

contract DelegatedOP is AccessControl, Multicall {
    using EnumerableSet for EnumerableSet.AddressSet;

    // from => total
    mapping(address => uint256) public subDelegationFrom;

    // to => total
    mapping(address => uint256) public subDelegationTo;

    // from => to => amount
    mapping(address => mapping(address => uint256)) public subDelegations;

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

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function getNativeDelegation(
        address account
    ) public view returns (uint256) {
        return IVotes(OP_ADDRESS).getVotes(account);
    }

    function getVotes(address account) public view returns (uint256) {
        return getNativeDelegation(account) + subDelegationTo[account];
    }

    function getProxyDelegatedVotes(
        address account
    ) public view returns (uint256) {
        return
            IVotes(OP_ADDRESS).getVotes(
                IAlligatorOP(ALIGATOR_ADDRESS).proxyAddress(account)
            );
    }

    function getRuleDelegation(
        uint32 notValidBefore,
        uint32 notValidAfter,
        IAlligatorOP.AllowanceType allowanceType,
        uint256 allowance,
        uint256 totalVotes
    ) public view returns (uint256) {
        if (
            block.timestamp < notValidBefore || block.timestamp > notValidAfter
        ) {
            return 0;
        }

        if (allowanceType == IAlligatorOP.AllowanceType.Absolute) {
            return allowance;
        } else if (allowanceType == IAlligatorOP.AllowanceType.Relative) {
            return (totalVotes * allowance) / 1e5;
        }

        return 0;
    }

    function reduceOverDelegation(
        address from,
        address to
    ) public onlyRole(OPERATOR_ROLE) {
        uint256 totalVotes = getProxyDelegatedVotes(from) +
            subDelegationTo[from];

        if (subDelegationFrom[from] > totalVotes) {
            uint256 overDelegation = subDelegationFrom[from] - totalVotes;
            uint256 currentDelegation = subDelegations[from][to];

            if (currentDelegation > 0) {
                uint256 reduction = currentDelegation > overDelegation
                    ? overDelegation
                    : currentDelegation;
                subDelegations[from][to] -= reduction;
                subDelegationFrom[from] -= reduction;
                subDelegationTo[to] -= reduction;

                emit OverDelegationReduced(from, to, reduction);
            }
        }
    }

    function updateSubDelegationRule(
        address from,
        address to
    ) public onlyRole(OPERATOR_ROLE) {
        (
            ,
            ,
            uint32 notValidBefore,
            uint32 notValidAfter,
            ,
            IAlligatorOP.AllowanceType allowanceType,
            uint256 allowance
        ) = IAlligatorOPSubdelegation(ALIGATOR_ADDRESS).subdelegations(
                from,
                to
            );

        uint256 totalVotes = getProxyDelegatedVotes(from) +
            subDelegationTo[from];

        uint256 ruleDelegation = getRuleDelegation(
            notValidBefore,
            notValidAfter,
            allowanceType,
            allowance,
            totalVotes
        );

        if (ruleDelegation > subDelegations[from][to]) {
            uint256 dif = ruleDelegation - subDelegations[from][to];
            subDelegations[from][to] = ruleDelegation;
            subDelegationFrom[from] += dif;
            subDelegationTo[to] += dif;
        } else if (ruleDelegation < subDelegations[from][to]) {
            uint256 dif = subDelegations[from][to] - ruleDelegation;
            subDelegations[from][to] = ruleDelegation;
            subDelegationFrom[from] -= dif;
            subDelegationTo[to] -= dif;
        }

        // Remove delegation if over-delegated
        if (subDelegationFrom[from] > totalVotes) {
            reduceOverDelegation(from, to);
        }

        emit SubDelegationRuleUpdated(from, to, ruleDelegation);
    }
}
