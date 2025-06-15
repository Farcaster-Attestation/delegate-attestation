import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import { getAddress } from "viem";
import { fetchAgoraTopDelegators } from "./agora";
import { getMultipleVotingPowers, getRanks, getVotingPower } from "./contract";

async function audit() {
  const ranks = await getRanks();
  const topDelegators = await fetchAgoraTopDelegators();
  const votingPowers = await getMultipleVotingPowers(
    ranks.map((a) => getAddress(a))
  );

  for (let i = 0; i < ranks.length; i++) {
    const address = ranks[i];
    const votingPower = votingPowers[i];

    if (!votingPower) {
      console.log("Voting power not found!", address);
      continue;
    }

    const topDelegatorIndex = topDelegators.findIndex(
      (d) => getAddress(d.address) === getAddress(address)
    );

    if (topDelegatorIndex != i) {
      console.log(
        "Rank mismatch!",
        address,
        "Agora:",
        topDelegatorIndex + 1,
        "Onchain:",
        i + 1
      );
    }

    const diffPercent = Math.abs(
      Number(
        BigInt(votingPower) -
          BigInt(topDelegators[topDelegatorIndex].votingPower.total)
      ) / parseInt(topDelegators[topDelegatorIndex].votingPower.total)
    );

    if (diffPercent > 0.0001) {
      console.log(
        "Voting power mismatch!",
        address,
        "Agora:",
        topDelegators[topDelegatorIndex].votingPower.total,
        "Onchain:",
        votingPower,
        `(${(diffPercent * 100).toFixed(2)}%)`
      );
    }
  }
}

audit()
  .then(() => {})
  .catch(console.error);
