# Dynamic Attestation Integration Guide

## Overview

This document provides instructions for integrating dynamic attestations. Normally, you can use EAS GraphQL or our cloud storage for off-chain integration, and the EAS contract for on-chain integration.

---

## EAS Schema

### Deployment

| Network    | EAS Schema Id Address                                                                                                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OP         | [0xcc51e24772be5054d0792c798e1a3dd80be559598f7d5400e11f24e4a6a0e49c](https://optimism.easscan.org/schema/view/0xcc51e24772be5054d0792c798e1a3dd80be559598f7d5400e11f24e4a6a0e49c)         |
| OP-Sepolia | [0xbc758ef858ac3c4a31f01d9b81154c262080c0d0293ccbb79c3432d2e2d1255c](https://optimism-sepolia.easscan.org/schema/view/0xbc758ef858ac3c4a31f01d9b81154c262080c0d0293ccbb79c3432d2e2d1255c) |

### Schema Definition

| Name                       | Type   | Description                                                                                                | Example Value |
| -------------------------- | ------ | ---------------------------------------------------------------------------------------------------------- | ------------- |
| rank                       | string | name of the delegates badge (ex. top100, top50, etc.)                                                      | top100        |
| includePartialDelegatation | bool   | indicate that this attestation include voting power from partial delegation                                | false         |
| date                       | string | date from which this attestation data originates. Normally, it should be the same as the attestation date. | 2024-12-09    |

Please note that currently, we create attestations for both Top 100 cases: those that include partial delegation and those that do not. This means that some delegates may receive two attestations with different values in the "includePartialDelegation" field.

---

## EAS GraphQL

### Overview

EAS GraphQL enables querying and managing attestations programmatically.

### Retrieve Top100 Delegates Attestations

This query will retrieve the Top 100 delegates attestations, including those with and without partial delegation. This means you will should always receive a total of 200 attestations.

EAS graphql url: [https://optimism.easscan.org/graphql](https://optimism.easscan.org/graphql)

```
query Attestations {
  attestations(orderBy: {time: desc}, where:{
    schemaId: {
      equals: "0xcc51e24772be5054d0792c798e1a3dd80be559598f7d5400e11f24e4a6a0e49c"
    },
    AND: [{
      revoked: {
        equals: false
      }
    },
    {
      attester: {
        equals: "0xD49CCff3DA665c126Bf1399a6084835ec057e7A3"
      }
    }]}) {
    id,
    schemaId,
    txid,
    attester,
    recipient,
    decodedDataJson
  }
}
```

## Google Cloud Storage Integration

### Overview

Google Cloud Storage is used to store the daily attestation list and revoke/issue logs for transparency with auditing and operational purposes.

### Bucket Structure

- attestation_list: Stores list of attestation id map with delegates address.
  - Format: `attestation_list.json`
  - Sample: https://storage.googleapis.com/dynamic_attestation_prod/mvp/attestation_list.json
- attestation_with_partial_vp: Store list of delegates address that need revoke or issue attestation with partial delegations.
  - Format: `yyyy-mm-dd/attestation_with_partial_vp.json`
  - Sample: https://storage.googleapis.com/dynamic_attestation_prod/mvp/2024-12-09/attestation_with_partial_vp.json
- attestation_without_partial_vp: Store list of delegates address that need revoke or issue attestation without partial delegations.
  - Format: `yyyy-mm-dd/attestation_without_partial_vp.json`
  - Sample: https://storage.googleapis.com/dynamic_attestation_prod/mvp/2024-12-09/attestation_without_partial_vp.json
- delegates_with_partial_vp: Store list of top100 delegates information with rank and voting power that include the parital delegation.
  - Format: `yyyy-mm-dd/delegates_with_partial_vp.json`
  - Sample: https://storage.googleapis.com/dynamic_attestation_prod/mvp/2024-12-09/delegates_with_partial_vp.json
- delegates_without_partial_vp: Store list of top100 delegates information with rank and voting power that does not include the parital delegation.
  - Format: `yyyy-mm-dd/delegates_without_partial_vp.json`
  - Sample: https://storage.googleapis.com/dynamic_attestation_prod/mvp/2024-12-09/delegates_without_partial_vp.json
- result: Store the result (txhash) of revoke/issue attestation.
  - Format: `yyyy-mm-dd/result.json`
  - Sample: https://storage.googleapis.com/dynamic_attestation_prod/mvp/2024-12-09/result.json
