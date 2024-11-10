// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Script, console, stdJson} from "forge-std/Script.sol";
import { EAS } from "@eas/contracts/EAS.sol";
import {CuriaResolver} from "@dynamic-attestation/src/CuriaResolver.sol";

contract DeployCuriaResolver is Script {
    using stdJson for string;

    CuriaResolver public resolver;

    uint256 public deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
    address public deployerAddress = vm.rememberKey(deployerPrivateKey);
    address public easAddress = vm.envAddress("EAS_ADDRESS");

    function run() public {
        string memory chainName = vm.envString("CHAIN_NAME");
        string memory root = vm.projectRoot();
        string memory basePath = string.concat(root, "/script/deployment/");
        string memory path = string.concat(basePath, chainName, ".json");
        
        vm.startBroadcast(deployerAddress);
        EAS eas = EAS(easAddress);
        resolver = new CuriaResolver(eas);
        resolver.setIssuer(deployerAddress, true);
        vm.stopBroadcast();

        // write output
        string memory parentObject = "parentObject";
        vm.serializeAddress(parentObject, "resolver", address(resolver));
        
        string memory chainInfo = "chainInfo";
        vm.serializeUint(chainInfo, "deploymentBlock", block.number);
        vm.serializeUint(chainInfo, "timestamp", block.timestamp);
        string memory chainInfoOutput = vm.serializeUint(
            chainInfo,
            "chainId",
            block.chainid
        );

        string memory finalJson = vm.serializeString(
            parentObject,
            chainInfo,
            chainInfoOutput
        );
        vm.writeJson(finalJson, path);
    }
}
