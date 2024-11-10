#!/bin/bash
source .env
forge script script/deploy.s.sol:DeployCuriaResolver --rpc-url $RPC_URL --broadcast