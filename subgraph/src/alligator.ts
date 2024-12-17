import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  SubDelegation as SubdelegationEvent,
  SubDelegations as SubDelegationsEvent,
  SubDelegations1 as SubDelegations2Event,
  SubDelegationSubdelegationRulesStruct,
} from "../generated/AlligatorOPV5/AlligatorOPV5";
import { getProxyAddress } from "./helper";
import { SubDelegationEntity } from "../generated/schema";

export function handleSubDelegation(event: SubdelegationEvent): void {
  const fromAddress = event.params.from;
  const toAddress = event.params.to;
  const rule = event.params.subdelegationRules;
  const entityId = `${event.transaction.hash.toHex()}-${event.logIndex.toString()}`;
  let entity = new SubDelegationEntity(entityId);
  entity.from = fromAddress.toHex();
  entity.to = toAddress.toHex();
  entity.maxRedelegations = rule.maxRedelegations;
  entity.blocksBeforeVoteCloses = rule.blocksBeforeVoteCloses;
  entity.notValidBefore = rule.notValidBefore;
  entity.notValidAfter = rule.notValidAfter;
  entity.customRule = rule.customRule.toHex();
  entity.allowanceType = rule.allowanceType == 0 ? "Absolute" : "Relative";
  entity.allowance = rule.allowance;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHex();
  entity.save();
  getProxyAddress(fromAddress, event.address);
}

export function handleSubDelegations(event: SubDelegationsEvent): void {
  const fromAddress = event.params.from;
  const rule = event.params.subdelegationRules;
  for (let i = 0; i < event.params.to.length; i++) {
    const toAddress = event.params.to[i];
    const entityId = `${event.transaction.hash.toHex()}-${event.logIndex.toString()}`;
    let entity = new SubDelegationEntity(entityId);
    entity.from = fromAddress.toHex();
    entity.to = toAddress.toHex();
    entity.maxRedelegations = rule.maxRedelegations;
    entity.blocksBeforeVoteCloses = rule.blocksBeforeVoteCloses;
    entity.notValidBefore = rule.notValidBefore;
    entity.notValidAfter = rule.notValidAfter;
    entity.customRule = rule.customRule.toHex();
    entity.allowanceType = rule.allowanceType == 0 ? "Absolute" : "Relative";
    entity.allowance = rule.allowance;
    entity.blockNumber = event.block.number;
    entity.blockTimestamp = event.block.timestamp;
    entity.transactionHash = event.transaction.hash.toHex();
    entity.save();
    getProxyAddress(fromAddress, event.address);
  }
}

export function handleSubDelegations2(event: SubDelegations2Event): void {
  const fromAddress = event.params.from;
  for (let i = 0; i < event.params.to.length; i++) {
    const toAddress = event.params.to[i];
    const rule = event.params.subdelegationRules[i];
    const entityId = `${event.transaction.hash.toHex()}-${event.logIndex.toString()}`;
    let entity = new SubDelegationEntity(entityId);
    entity.from = fromAddress.toHex();
    entity.to = toAddress.toHex();
    entity.maxRedelegations = rule.maxRedelegations;
    entity.blocksBeforeVoteCloses = rule.blocksBeforeVoteCloses;
    entity.notValidBefore = rule.notValidBefore;
    entity.notValidAfter = rule.notValidAfter;
    entity.customRule = rule.customRule.toHex();
    entity.allowanceType = rule.allowanceType == 0 ? "Absolute" : "Relative";
    entity.allowance = rule.allowance;
    entity.blockNumber = event.block.number;
    entity.blockTimestamp = event.block.timestamp;
    entity.transactionHash = event.transaction.hash.toHex();
    entity.save();
    getProxyAddress(fromAddress, event.address);
  }
}
