import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
  DelegateChanged as DelegateChangedEvent,
  DelegateVotesChanged as DelegateVotesChangedEvent,
  Transfer as TransferEvent,
} from "../generated/GovernanceToken/GovernanceToken";
import {
  Transfer,
  DelegateChanged,
  DelegateVotesChanged,
} from "../generated/schema";
import {
  getAccount,
  getDelegate,
  updateAccountBalance,
  getDailyDelegate,
  ZERO_ADDRESS,
  updateDailyBalance,
  updateSubDelegatorVotingPower,
} from "./helper";

export function handleDelegateChanged(event: DelegateChangedEvent): void {
  const fromDelegate = event.params.fromDelegate;
  const toDelegate = event.params.toDelegate;
  const delegator = event.params.delegator;
  // log delegate changed event
  const delegateChangedId = `${event.transaction.hash.toHex()}-${event.logIndex.toString()}`;
  let delegateChanged = new DelegateChanged(delegateChangedId);
  delegateChanged.fromDelegate = fromDelegate.toHex();
  delegateChanged.toDelegate = toDelegate.toHex();
  delegateChanged.delegator = delegator.toHex();
  delegateChanged.blockNumber = event.block.number;
  delegateChanged.blockTimestamp = event.block.timestamp;
  delegateChanged.transactionHash = event.transaction.hash.toHex();
  delegateChanged.save();
  // update delegate voting power
  let account = getAccount(delegator);
  account.delegatedTo = toDelegate.toHex();
  account.save();
}

export function handleDelegateVotesChanged(
  event: DelegateVotesChangedEvent
): void {
  const delegate = event.params.delegate;
  const previousBalance = event.params.previousBalance;
  const newBalance = event.params.newBalance;
  const delegateVotesChangedId = `${event.transaction.hash.toHex()}-${event.logIndex.toString()}`;
  let delegateVotesChanged = new DelegateVotesChanged(delegateVotesChangedId);
  delegateVotesChanged.delegate = delegate.toHex();
  delegateVotesChanged.previousBalance = previousBalance;
  delegateVotesChanged.newBalance = newBalance;
  delegateVotesChanged.blockNumber = event.block.number;
  delegateVotesChanged.blockTimestamp = event.block.timestamp;
  delegateVotesChanged.transactionHash = event.transaction.hash.toHex();
  delegateVotesChanged.save();
  // update delegate voting power
  let delegateEntity = getDelegate(delegate);
  delegateEntity.directVotingPower = newBalance;
  delegateEntity.totalVotingPower = delegateEntity.directVotingPower.plus(
    delegateEntity.subVotingPower
  );
  delegateEntity.save();
  // update daily delegate
  let dailyDelegate = getDailyDelegate(delegate, event.block.timestamp);
  dailyDelegate.directVotingPower = newBalance;
  dailyDelegate.save();

  // update subdelegator voting power if it's a proxy
  if (delegateEntity.isProxy && delegateEntity.proxyOf) {
    const ownerDelegate = getDelegate(
      Address.fromHexString(delegateEntity.proxyOf)
    );
    const subdelegatees = ownerDelegate.subdelegatees.load();
    for (let i = 0; i < subdelegatees.length; i++) {
      updateSubDelegatorVotingPower(subdelegatees[i], event.block.timestamp);
    }
  }
}

export function handleTransfer(event: TransferEvent): void {
  // log transfer event first
  const from = event.params.from;
  const to = event.params.to;
  const value = event.params.value;
  const id = `${event.transaction.hash.toHex()}-${event.logIndex.toString()}`;
  let transfer = new Transfer(id);
  transfer.from = from.toHex();
  transfer.to = to.toHex();
  transfer.value = value;
  transfer.blockNumber = event.block.number;
  transfer.blockTimestamp = event.block.timestamp;
  transfer.transactionHash = event.transaction.hash.toHex();
  transfer.save();

  // mint
  const timestamp = event.block.timestamp;
  if (from.toHex() == ZERO_ADDRESS) {
    updateAccountBalance(to, value);
    updateDailyBalance(to, timestamp);
  } else if (to.toHex() == ZERO_ADDRESS) {
    // burn
    updateAccountBalance(from, value.neg());
    updateDailyBalance(from, timestamp);
  } else {
    updateAccountBalance(from, value.neg());
    updateAccountBalance(to, value);
    updateDailyBalance(from, timestamp);
    updateDailyBalance(to, timestamp);
  }
}
