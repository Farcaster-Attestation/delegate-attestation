import { Address, BigInt, Bytes, json, store } from "@graphprotocol/graph-ts";
import {
  Account,
  DailyBalance,
  DailyDelagate,
  DailySubDelegation,
  Delegate,
  ProxyAddress,
  SubDelegationEntity,
  SubDelegationTrigger,
  SubDelegationTriggerContainer,
  SubDelegator,
} from "../generated/schema";
import { AlligatorOPV5 } from "../generated/AlligatorOPV5/AlligatorOPV5";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export class SubDelegationRuleObject {
  maxRedelegations: i32;
  blocksBeforeVoteCloses: i32;
  notValidBefore: BigInt;
  notValidAfter: BigInt;
  customRule: Address;
  allowanceType: i32;
  allowance: BigInt;

  constructor() {
    this.maxRedelegations = 0;
    this.blocksBeforeVoteCloses = 0;
    this.notValidBefore = new BigInt(0);
    this.notValidAfter = new BigInt(0);
    this.customRule = Address.fromString(ZERO_ADDRESS);
    this.allowanceType = 0;
    this.allowance = new BigInt(0);
  }
}

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
    delegate.totalVotingPower = new BigInt(0);
    delegate.directVotingPower = new BigInt(0);
    delegate.subVotingPower = new BigInt(0);
    delegate.isProxy = false;
  }
  return delegate;
}

export function updateDelegateVotingPower(
  address: Address,
  value: BigInt
): void {
  let delegate = getDelegate(address);
  delegate.directVotingPower = delegate.directVotingPower.plus(value);
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
    dailyDelegate.directVotingPower = new BigInt(0);
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

export function updateDailyBalance(address: Address, timestamp: BigInt): void {
  let dailyBalance = getDailyBalance(address, timestamp);
  const account = getAccount(address);
  dailyBalance.balance = account.balance;
  dailyBalance.save();
}

export function getProxyAddress(
  address: Address,
  contractAddress: Address
): ProxyAddress {
  let proxyAddressId = address.toHex();
  let proxyAddress = ProxyAddress.load(proxyAddressId);
  if (proxyAddress == null) {
    const contract = AlligatorOPV5.bind(contractAddress);
    const proxy = contract.proxyAddress(address);
    proxyAddress = new ProxyAddress(proxyAddressId);
    proxyAddress.address = address.toHex();
    proxyAddress.proxy = proxy.toHex();
    proxyAddress.save();

    const delegate = getDelegate(proxy);
    delegate.proxyOf = address.toHex();
    delegate.isProxy = true;
    delegate.save();
  }
  return proxyAddress;
}

export function getProxyAddressUnsafe(address: Address): ProxyAddress | null {
  let proxyAddressId = address.toHex();
  let proxyAddress = ProxyAddress.load(proxyAddressId);
  return proxyAddress;
}

export function getSubDelegator(from: Address, to: Address): SubDelegator {
  let subdelegatorId = `${from.toHex()}-${to.toHex()}`;
  let subdelegator = SubDelegator.load(subdelegatorId);
  if (subdelegator == null) {
    subdelegator = new SubDelegator(subdelegatorId);
    subdelegator.from = from.toHex();
    subdelegator.to = to.toHex();
  }
  return subdelegator;
}

export function getDailySubDelegation(
  fromAddress: Address,
  toAddress: Address,
  timestamp: BigInt
): DailySubDelegation {
  let timestampInt = timestamp.toI32();
  let dayId = timestampInt / 86400;
  let startTimestamp = dayId * 86400;
  let dailySubDelegationId = `${fromAddress.toHex()}-${toAddress.toHex()}-${dayId.toString()}`;
  let dailySubDelegation = DailySubDelegation.load(dailySubDelegationId);
  if (dailySubDelegation == null) {
    dailySubDelegation = new DailySubDelegation(dailySubDelegationId);
    dailySubDelegation.from = fromAddress.toHex();
    dailySubDelegation.to = toAddress.toHex();
    dailySubDelegation.date = startTimestamp;
  }
  return dailySubDelegation;
}

export function getMaxSubDelegation(subdelegator: SubDelegator): BigInt {
  let delegate = getDelegate(Address.fromHexString(subdelegator.from!));
  let proxy = getProxyAddressUnsafe(Address.fromHexString(subdelegator.to!));

  if (proxy == null) return delegate.subVotingPower;

  let proxyDelegate = getDelegate(Address.fromHexString(proxy.proxy));
  return delegate.subVotingPower.plus(
    proxyDelegate.directVotingPower || new BigInt(0)
  );
}

export function updateSubDelegatorVotingPower(
  subdelegator: SubDelegator,
  blockTimestamp: BigInt
): void {
  let subVotingPower = new BigInt(0);
  let maxSubDelegation = getMaxSubDelegation(subdelegator);

  if (
    subdelegator.notValidAfter.notEqual(BigInt.zero()) &&
    blockTimestamp.ge(subdelegator.notValidBefore) &&
    blockTimestamp.le(subdelegator.notValidAfter)
  ) {
    if (subdelegator.allowanceType == 0) {
      subVotingPower = subdelegator.allowance;
    } else {
      subVotingPower = maxSubDelegation
        .times(subdelegator.allowance)
        .div(BigInt.fromU32(100000));
    }
  }

  if (subVotingPower.gt(maxSubDelegation)) {
    subVotingPower = maxSubDelegation;
  }

  // update delegate voting power
  let delegate = getDelegate(Address.fromHexString(subdelegator.to!));
  if (subVotingPower.gt(subdelegator.votingPower)) {
    let delta = subVotingPower.minus(subdelegator.votingPower);
    delegate.subVotingPower = delegate.subVotingPower.plus(delta);
  } else {
    let delta = subdelegator.votingPower.minus(subVotingPower);
    delegate.subVotingPower = delegate.subVotingPower.minus(delta);
  }
  delegate.totalVotingPower = delegate.directVotingPower.plus(
    delegate.subVotingPower
  );
  delegate.save();

  // update subdelegator voting power
  subdelegator.votingPower = subVotingPower;
  subdelegator.save();

  updateSubDelegatorTrigger(subdelegator, blockTimestamp);
}

export function updateSubDelegatorTrigger(
  subdelegator: SubDelegator,
  blockTimestamp: BigInt
): void {
  let requireStart = subdelegator.notValidBefore.gt(blockTimestamp);
  let requireEnd =
    subdelegator.notValidAfter.notEqual(BigInt.zero()) &&
    subdelegator.notValidAfter.lt(blockTimestamp);

  // Remove triggers
  let triggerStart = SubDelegationTrigger.load(`${subdelegator.id}-start`);
  if (triggerStart != null && !requireStart) {
    store.remove("SubDelegationTrigger", triggerStart.id);
  }
  let triggerEnd = SubDelegationTrigger.load(`${subdelegator.id}-end`);
  if (triggerEnd != null && !requireEnd) {
    store.remove("SubDelegationTrigger", triggerEnd.id);
  }

  // Create new triggers
  if (requireStart) {
    let triggerTimestamp = subdelegator.notValidBefore.toU64().toString();

    // Create container
    let container =
      SubDelegationTriggerContainer.load(triggerTimestamp) ||
      new SubDelegationTriggerContainer(triggerTimestamp);
    container.save();

    if (!triggerStart) {
      triggerStart = new SubDelegationTrigger(`${subdelegator.id}-start`);
    }
    triggerStart.from = subdelegator.from;
    triggerStart.to = subdelegator.to;
    triggerStart.blockTimestamp = triggerTimestamp;
    triggerStart.save();
  }

  if (requireEnd) {
    let triggerTimestamp = (subdelegator.notValidAfter.toU64() + 1).toString();

    // Create container
    let container =
      SubDelegationTriggerContainer.load(triggerTimestamp) ||
      new SubDelegationTriggerContainer(triggerTimestamp);
    container.save();

    if (!triggerEnd) {
      triggerEnd = new SubDelegationTrigger(`${subdelegator.id}-end`);
    }
    triggerEnd.from = subdelegator.from;
    triggerEnd.to = subdelegator.to;
    triggerEnd.blockTimestamp = triggerTimestamp;
    triggerEnd.save();
  }
}

export function recordSubDelegation(
  fromAddress: Address,
  toAddress: Address,
  rule: SubDelegationRuleObject,
  contractAddress: Address,
  blockNumber: BigInt,
  blockTimestamp: BigInt,
  transactionHash: Bytes
): void {
  // update proxy address
  getProxyAddress(fromAddress, contractAddress);
  // save subdelegation entity
  const entityId = `${transactionHash.toHex()}-${blockNumber.toString()}`;
  let entity = new SubDelegationEntity(entityId);
  entity.from = fromAddress.toHex();
  entity.to = toAddress.toHex();
  entity.maxRedelegations = rule.maxRedelegations;
  entity.blocksBeforeVoteCloses = rule.blocksBeforeVoteCloses;
  entity.notValidBefore = rule.notValidBefore;
  entity.notValidAfter = rule.notValidAfter;
  entity.customRule = rule.customRule.toHex();
  entity.allowanceType = rule.allowanceType;
  entity.allowance = rule.allowance;
  entity.blockNumber = blockNumber;
  entity.blockTimestamp = blockTimestamp;
  entity.transactionHash = transactionHash.toHex();
  entity.save();

  // update subdelegation rule
  let subdelegator = getSubDelegator(fromAddress, toAddress);
  subdelegator.maxRedelegations = rule.maxRedelegations;
  subdelegator.blocksBeforeVoteCloses = rule.blocksBeforeVoteCloses;
  subdelegator.notValidBefore = rule.notValidBefore;
  subdelegator.notValidAfter = rule.notValidAfter;
  subdelegator.customRule = rule.customRule.toHex();
  subdelegator.allowanceType = rule.allowanceType;
  subdelegator.allowance = rule.allowance;
  updateSubDelegatorVotingPower(subdelegator, blockTimestamp);

  // update daily subdelegation
  let dailySubDelegation = getDailySubDelegation(
    fromAddress,
    toAddress,
    blockTimestamp
  );
  dailySubDelegation.maxRedelegations = rule.maxRedelegations;
  dailySubDelegation.blocksBeforeVoteCloses = rule.blocksBeforeVoteCloses;
  dailySubDelegation.notValidBefore = rule.notValidBefore;
  dailySubDelegation.notValidAfter = rule.notValidAfter;
  dailySubDelegation.customRule = rule.customRule.toHex();
  dailySubDelegation.allowanceType = rule.allowanceType;
  dailySubDelegation.allowance = rule.allowance;
  dailySubDelegation.save();
}
