import {
  createPublicClient,
  createWalletClient,
  http,
  encodeFunctionData,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { optimism } from "viem/chains";
import RankerABI from "./abi/RankerABI";
import DelegatedOPABI from "./abi/DelegatedOPABI";

if (!process.env.PRIVATE_KEY) {
  throw new Error("PRIVATE_KEY environment variable is required");
}

export const delegatedOPAddress = process.env
  .DELEGATED_OP_ADDRESS as `0x${string}`;
export const rankerAddress = process.env.RANKER_ADDRESS as `0x${string}`;

export const publicClient = createPublicClient({
  chain: optimism,
  transport: http(),
});

export const walletClient = createWalletClient({
  account: privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`),
  chain: optimism,
  transport: http(),
});

export async function getRanks() {
  const ranks = await publicClient.readContract({
    address: rankerAddress,
    abi: RankerABI,
    functionName: "getRanks",
  });
  return ranks;
}

export async function updateSubDelegationRule(
  from: `0x${string}`,
  to: `0x${string}`
) {
  const hash = await walletClient.writeContract({
    address: delegatedOPAddress,
    abi: DelegatedOPABI,
    functionName: "updateSubDelegationRule",
    args: [from, to],
  });

  await publicClient.waitForTransactionReceipt({ hash });
}

export async function updateRank(address: `0x${string}`) {
  const hash = await walletClient.writeContract({
    address: rankerAddress,
    abi: RankerABI,
    functionName: "updateRank",
    args: [address],
  });

  await publicClient.waitForTransactionReceipt({ hash });
}

export async function updateMultipleRanks(addresses: `0x${string}`[]) {
  const calls = addresses.map((address) =>
    encodeFunctionData({
      abi: RankerABI,
      functionName: "updateRank",
      args: [address],
    })
  );

  const hash = await walletClient.writeContract({
    address: rankerAddress,
    abi: RankerABI,
    functionName: "multicall",
    args: [calls],
  });

  await publicClient.waitForTransactionReceipt({ hash });
}

export async function updateMultipleSubDelegationRules(
  froms: `0x${string}`[],
  tos: `0x${string}`[]
) {
  if (froms.length !== tos.length) {
    throw new Error("Arrays must have same length");
  }

  const calls = froms.map((from, i) =>
    encodeFunctionData({
      abi: DelegatedOPABI,
      functionName: "updateSubDelegationRule",
      args: [from, tos[i]],
    })
  );

  const hash = await walletClient.writeContract({
    address: delegatedOPAddress,
    abi: DelegatedOPABI,
    functionName: "multicall",
    args: [calls],
  });

  await publicClient.waitForTransactionReceipt({ hash });
}

export async function getVotingPower(address: `0x${string}`) {
  const votingPower = await publicClient.readContract({
    address: delegatedOPAddress,
    abi: DelegatedOPABI,
    functionName: "getVotes",
    args: [address],
  });

  return votingPower;
}

export async function getMultipleVotingPowers(addresses: `0x${string}`[]) {
  const votingPowers = await publicClient.multicall({
    contracts: addresses.map((address) => ({
      address: delegatedOPAddress,
      abi: DelegatedOPABI,
      functionName: "getVotes",
      args: [address],
    })),
  });

  return votingPowers.map((v) => v.result);
}
