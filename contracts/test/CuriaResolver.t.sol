// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {Test, console} from "forge-std/Test.sol";
import {CuriaResolver} from "@dynamic-attestation/src/CuriaResolver.sol";
import {ISchemaResolver} from "@eas/contracts/resolver/ISchemaResolver.sol";
import {ISchemaRegistry, SchemaRegistry} from "@eas/contracts/SchemaRegistry.sol";
import {IEAS, EAS, AttestationRequest, AttestationRequestData} from "@eas/contracts/EAS.sol";

contract CuriaResolverTest is Test {
    ISchemaResolver public resolver;
    IEAS public eas;
    ISchemaRegistry public schemaRegistry;
    address public owner = address(0xbeef)
    address public issuer = address(0xcafe);
    address public anon = address(0xdead);
    bytes32 public schemaId;
    string public schema = "string rank,bool includePartialDelegatation,string date";

    function setUp() public {
        schemaRegistry = new SchemaRegistry();
        eas = new EAS(schemaRegistry);
        // register schema
        vm.startPrank(owner);
        resolver = new CuriaResolverTest(eas);
        resolver.setIssuer(issuer, true);
        vm.stopPrank();
        schemaId = schemaRegistry.register(schema, resolver, true);
    }

    function testAttest() public {
        AttestationRequestData memory data = AttestationRequestData({
            recipient: anon,
            revocable: true,
            refUID: bytes32(0),
            data: abi.encodeWithSignature(schema, "top100", true, "2024-11-09"),
            expirationTime: 0,
            value: 0
        });
        AttestationRequest memory request = AttestationRequest({
            schema: schemaId,
            data: data
        });
        bytes32 attest = eas.attest(request);
        console.log(vm.toString(attest));
    }
}
