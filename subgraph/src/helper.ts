import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
  Account,
  DailyBalance,
  DailyDelagate,
  Delegate,
} from "../generated/schema";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function getAccount(address: Address): Account {
  let accountId = address.toHex();
  let account = Account.load(accountId);
  if (account == null) {
    account = new Account(accountId);
    account.address = address.toHex();
    account.balance = new BigInt(0);
  }
  return account;
}

export function updateAccountBalance(address: Address, value: BigInt): void {
  let account = getAccount(address);
  account.balance = account.balance.plus(value);
  account.save();
}

export function getDelegate(address: Address): Delegate {
  let delegateId = address.toHex();
  let delegate = Delegate.load(delegateId);
  if (delegate == null) {
    delegate = new Delegate(delegateId);
    delegate.address = address.toHex();
    delegate.votingPower = new BigInt(0);
  }
  return delegate;
}

export function updateDelegateVotingPower(
  address: Address,
  value: BigInt
): void {
  let delegate = getDelegate(address);
  delegate.votingPower = delegate.votingPower.plus(value);
  delegate.save();
}

export function getDailyDelegate(
  address: Address,
  timestamp: BigInt
): DailyDelagate {
  const timestampInt = timestamp.toI32();
  let dayId = timestampInt / 86400;
  let startTimestamp = dayId * 86400;
  const dailyDelegateId = `${address.toHex()}-${dayId.toString()}`;
  let dailyDelegate = DailyDelagate.load(dailyDelegateId);
  if (dailyDelegate == null) {
    dailyDelegate = new DailyDelagate(dailyDelegateId);
    dailyDelegate.delegate = address.toHex();
    dailyDelegate.date = startTimestamp;
    dailyDelegate.votingPower = new BigInt(0);
  }
  return dailyDelegate;
}

export function getDailyBalance(
  address: Address,
  timestamp: BigInt
): DailyBalance {
  const timestampInt = timestamp.toI32();
  let dayId = timestampInt / 86400;
  let startTimestamp = dayId * 86400;
  const dailyBalanceId = `${address.toHex()}-${dayId.toString()}`;
  let dailyBalance = DailyBalance.load(dailyBalanceId);
  if (dailyBalance == null) {
    dailyBalance = new DailyBalance(dailyBalanceId);
    dailyBalance.account = address.toHex();
    dailyBalance.date = startTimestamp;
    dailyBalance.balance = new BigInt(0);
  }
  return dailyBalance;
}

export function updateDailyBalance(
  address: Address,
  timestamp: BigInt,
  value: BigInt
): void {
  let dailyBalance = getDailyBalance(address, timestamp);
  dailyBalance.balance = dailyBalance.balance.plus(value);
  dailyBalance.save();
}
