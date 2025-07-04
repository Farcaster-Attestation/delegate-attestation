// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Script, console, stdJson} from "forge-std/Script.sol";
import {DelegatedOP} from "../src/DelegatedOP.sol";
import {DelegatedOPRanker} from "../src/DelegatedOPRanker.sol";
import {EAS} from "@eas/contracts/EAS.sol";

contract DeployDelegatedOP is Script {
    using stdJson for string;

    DelegatedOP public delegatedOP;
    DelegatedOPRanker public ranker;

    uint256 public deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
    address public deployerAddress = vm.rememberKey(deployerPrivateKey);
    address public easAddress = vm.envAddress("EAS_ADDRESS");
    uint256 public maxRanks = vm.envUint("MAX_RANKS");

    function run() public {
        string memory chainName = vm.envString("CHAIN_NAME");
        string memory root = vm.projectRoot();
        string memory basePath = string.concat(root, "/script/deployment/");
        string memory path = string.concat(basePath, chainName, ".json");

        vm.startBroadcast(deployerAddress);

        // Deploy DelegatedOP
        delegatedOP = new DelegatedOP();

        // Deploy DelegatedOPRanker
        EAS eas = EAS(easAddress);
        ranker = new DelegatedOPRanker(eas, address(delegatedOP), maxRanks);
        ranker.initialize();

        vm.stopBroadcast();

        // Write output
        string memory parentObject = "parentObject";
        vm.serializeAddress(parentObject, "delegatedOP", address(delegatedOP));
        vm.serializeAddress(parentObject, "ranker", address(ranker));

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
