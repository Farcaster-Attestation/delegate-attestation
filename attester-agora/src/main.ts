import { getAddress } from "viem";
import { fetchAdvancedDelegations, fetchAgoraTopDelegators } from "./agora";
import {
  getRanks,
  updateMultipleSubDelegationRules,
  updateRank,
} from "./contract";
import { logger } from "./logger";
import { xor } from "lodash";

let running = false;

export async function main() {
  if (running) {
    return;
  }
  running = true;

  logger.info("Updating ranker attestation...");

  const ranks = await getRanks();
  const topDelegators = await fetchAgoraTopDelegators();
  const topDelegatorsAddresses = topDelegators
    .map((d) => d.address)
    .map((a) => getAddress(a));

  const needUpdates = xor(ranks, topDelegatorsAddresses);

  if (needUpdates.length > 0) {
    logger.info(`Need to update ${needUpdates.length} ranks`);

    for (const delegator of needUpdates) {
      logger.info(`Updating ${delegator} rank`);
      const delegations = await fetchAdvancedDelegations(delegator);

      if (delegations.length > 0) {
        logger.info(
          `Updating ${delegator} subdelegations from ${delegations
            .map((d) => d.from)
            .join(", ")}`
        );

        // Update sub delegation rules
        await updateMultipleSubDelegationRules(
          delegations.map((d) => d.from),
          delegations.map((d) => d.to)
        );
      }

      // Update rank
      await updateRank(delegator);
    }
  }

  running = false;
}
