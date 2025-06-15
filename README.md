# Delegate Attestation

## Overview

Delegate Attestation is an onchain implementation that utilizes the Ethereum Attestation Service (EAS) for issuing attestations to the top 100 delegates in Optimism's governance system.

## EAS Schema

https://optimism.easscan.org/schema/view/0x8e2611b956fe603041d7fea2c8616c5e0dfb50becf30f640ab3154e4534eecd9

## Deployments

* DelegatedOP: [0xD9A34128BfA448Af58d28345200539f81E840Eec](https://optimistic.etherscan.io/address/0xD9A34128BfA448Af58d28345200539f81E840Eec)
* Ranker: [0xFd620d657316f96186B3a9E3C8b97ED83281eFDB](https://optimistic.etherscan.io/address/0xFd620d657316f96186B3a9E3C8b97ED83281eFDB)

### Components

- **attester**: An indexer that periodically retrieves the list of top delegates from the Agora API, compares it to the on-chain smart contracts, and—whenever it detects a discrepancy—submits an on-chain transaction to bring the on-chain data back into sync.
- **contracts**: Provide an EAS resolver contract that will calculate delegated OP fully onchain for both direct and subdelegation.
- **subgraph**: The subgraph indexes about delegation event from OP contract and subdelegation from Alligator contract. This subgraph is also have daily snapshot of latest change on direct delegation for each delegates.
