// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Test, console} from "forge-std/Test.sol";
import {IEAS, Attestation} from "@eas/contracts/IEAS.sol";
import {ICuriaResolver} from "@dynamic-attestation/src/ICuriaResolver.sol";
import {SchemaResolver} from "@eas/contracts/resolver/SchemaResolver.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract CuriaResolver is ICuriaResolver, Ownable, SchemaResolver {
    mapping(address => bool) public isIssuer;

    constructor(IEAS eas) SchemaResolver(eas) {}

    function _checkIssuer(Attestation calldata attestation) internal view {
        address attestor = attestation.attester;
        if (!isIssuer[attestor]) {
            revert NotIssuer();
        }
    }

    function setIssuer(address account, bool enable) external override onlyOwner {
        isIssuer[account] = enable;
        emit IssuerUpdated(account, enable);
    }

    function onAttest(Attestation calldata attestation, uint256 value) internal view override returns (bool) {
        _checkIssuer(attestation);
        return true;
    }

    function onRevoke(Attestation calldata attestation, uint256 value) internal view override returns (bool) {
        return true;
    }
}
