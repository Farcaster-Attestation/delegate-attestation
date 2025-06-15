import axios from "axios";

export interface AgoraDelegate {
  address: `0x${string}`;
  votingPower: {
    total: string;
    direct: string;
    advanced: string;
  };
  lastVoteBlock: string;
  participation: number;
}

export interface AgoraDelegation {
  from: `0x${string}`;
  to: `0x${string}`;
  allowance: string;
  percentage: string;
  timestamp: string;
  type: "ADVANCED" | "BASIC";
  amount: "PARTIAL" | "FULL";
  transaction_hash: `0x${string}`;
}

export async function fetchAgoraTopDelegators(): Promise<AgoraDelegate[]> {
  const response = await axios.get(
    "https://vote.optimism.io/api/v1/delegates",
    {
      params: {
        limit: 100,
        offset: 0,
        sort: "voting_power",
      },
      headers: {
        Authorization: `Bearer ${process.env.AGORA_API_KEY}`,
      },
    }
  );
  return response.data.data;
}

export async function fetchAdvancedDelegations(
  address: `0x${string}`
): Promise<AgoraDelegation[]> {
  const delegations: AgoraDelegation[] = [];
  let hasNext = true;
  let offset = 0;
  const limit = 100;

  while (hasNext) {
    const response = await axios.get(
      `https://vote.optimism.io/api/v1/delegates/${address}/delegators`,
      {
        params: {
          offset,
          limit,
        },
        headers: {
          Authorization: `Bearer ${process.env.AGORA_API_KEY}`,
        },
      }
    );

    const { data, meta } = response.data;

    // Assumption: advanced delegations come first
    let foundNormal = false;
    for (const delegation of data) {
      if (delegation.type === "ADVANCED") {
        delegations.push(delegation);
      } else {
        foundNormal = true;
        break;
      }
    }

    if (foundNormal) {
      break;
    }

    hasNext = meta.has_next;
    offset = meta.next_offset;
  }

  return delegations;
}
