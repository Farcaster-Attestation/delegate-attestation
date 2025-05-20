// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Multicall} from "@openzeppelin/contracts/utils/Multicall.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {IEAS, Attestation, AttestationRequest, AttestationRequestData, RevocationRequest, RevocationRequestData} from "@eas/contracts/IEAS.sol";
import {SchemaResolver, ISchemaResolver} from "@eas/contracts/resolver/SchemaResolver.sol";

bytes32 constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

interface IDelegatedOP {
    function getVotes(address account) external view returns (uint256);
}

contract DelegatedOPRanker is
    AccessControl,
    Multicall,
    SchemaResolver,
    Initializable
{
    // EAS contract
    IEAS public immutable eas;

    // The DelegatedOP contract address
    address public immutable delegatedOP;

    // Maximum number of ranks
    uint256 public immutable maxRanks;

    // Schema for attestations
    bytes32 public schemaId;

    // Thresholds for each rank (index 0 = rank 1, index 1 = rank 2, etc.)
    address[] public ranks;

    // Votes for each account
    mapping(address => uint256) public delegations;

    // Mapping of account to their current attestation UID
    mapping(address => bytes32) public attestationUIDs;

    error RankTooLow();
    error NotAuthorized();

    event RankUpdated(
        address indexed account,
        uint256 oldRank,
        uint256 newRank,
        bytes32 attestationUID
    );

    constructor(
        IEAS _eas,
        address _delegatedOP,
        uint256 _maxRanks
    ) SchemaResolver(_eas) {
        delegatedOP = _delegatedOP;
        maxRanks = _maxRanks;
        eas = _eas;
    }

    function initialize() public initializer {
        schemaId = eas.getSchemaRegistry().register(
            "bool isTopDelegate",
            ISchemaResolver(address(this)),
            true
        );

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function getRank(address account) public view returns (uint256) {
        unchecked {
            for (uint256 i = 0; i < ranks.length; i++) {
                if (ranks[i] == account) return i + 1;
            }

            return 0;
        }
    }

    function getRankByDelegation(
        uint256 delegation
    ) public view returns (uint256) {
        unchecked {
            for (uint256 i = 0; i < ranks.length; i++) {
                if (delegation > delegations[ranks[i]]) return i + 1;
            }

            if (ranks.length < maxRanks) return ranks.length + 1;

            return 0;
        }
    }

    function _createAttestation(address account) internal returns (bytes32) {
        // Create attestation data
        bytes memory attestationData = abi.encode(true);

        // Create attestation request
        AttestationRequest memory request = AttestationRequest({
            schema: schemaId,
            data: AttestationRequestData({
                recipient: account,
                expirationTime: 0, // No expiration
                revocable: true,
                refUID: bytes32(0),
                data: attestationData,
                value: 0
            })
        });

        // Create the attestation
        return eas.attest(request);
    }

    function _revokeAttestation(bytes32 uid) internal {
        if (uid != bytes32(0)) {
            eas.revoke(
                RevocationRequest({
                    schema: schemaId,
                    data: RevocationRequestData({uid: uid, value: 0})
                })
            );
        }
    }

    function updateRank(address account) public {
        uint256 delegation = IDelegatedOP(delegatedOP).getVotes(account);
        uint256 currentRank = getRank(account);
        uint256 newRank = getRankByDelegation(delegation);

        if (newRank == 0) {
            if (currentRank == 0) {
                revert RankTooLow();
            }

            // Revoke old attestation
            _revokeAttestation(attestationUIDs[account]);
        }

        // Update the delegation amount for the account
        delegations[account] = delegation;

        // If the account is already in ranks array, remove it
        if (currentRank > 0) {
            // Move all elements after the current position one position back
            for (uint256 i = currentRank - 1; i < ranks.length - 1; i++) {
                ranks[i] = ranks[i + 1];
            }
            ranks.pop();
        } else {
            // Create new attestation
            bytes32 newAttestationUID = _createAttestation(account);
            attestationUIDs[account] = newAttestationUID;

            if (ranks.length >= maxRanks) {
                // Revoke attestation for the last rank
                address lastRank = ranks[ranks.length - 1];
                _revokeAttestation(attestationUIDs[lastRank]);
                attestationUIDs[lastRank] = bytes32(0);
            }
        }

        if (newRank > 0) {
            // Insert the account at the new position
            if (newRank <= ranks.length) {
                // Move all elements from newRank-1 to end one position forward
                ranks.push(ranks[ranks.length - 1]); // Extend array by one
                for (uint256 i = ranks.length - 1; i > newRank - 1; i--) {
                    ranks[i] = ranks[i - 1];
                }
                ranks[newRank - 1] = account;
            } else {
                // If newRank is at the end, simply append
                ranks.push(account);
            }
        }

        if (currentRank != newRank) {
            emit RankUpdated(
                account,
                currentRank,
                newRank,
                attestationUIDs[account]
            );
        }
    }

    function onAttest(
        Attestation calldata attestation,
        uint256 value
    ) internal view override returns (bool) {
        return attestation.attester == address(this);
    }

    function onRevoke(
        Attestation calldata attestation,
        uint256 value
    ) internal view override returns (bool) {
        return attestation.attester == address(this);
    }
}
