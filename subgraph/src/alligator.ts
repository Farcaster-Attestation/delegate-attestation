import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
  SubDelegation as SubdelegationEvent,
  SubDelegations as SubDelegationsEvent,
  SubDelegations1 as SubDelegations2Event,
} from "../generated/AlligatorOPV5/AlligatorOPV5";
import {
  SubDelegationRuleObject,
  getSubDelegator,
  recordSubDelegation,
  updateSubDelegatorVotingPower,
} from "./helper";
import {
  SubDelegationEntity,
  SubDelegationTriggerContainer,
  SubDelegator,
} from "../generated/schema";

export function handleSubDelegation(event: SubdelegationEvent): void {
  const fromAddress = event.params.from;
  const toAddress = event.params.to;
  const rule = new SubDelegationRuleObject();
  rule.maxRedelegations = event.params.subdelegationRules.maxRedelegations;
  rule.blocksBeforeVoteCloses =
    event.params.subdelegationRules.blocksBeforeVoteCloses;
  rule.notValidBefore = event.params.subdelegationRules.notValidBefore;
  rule.notValidAfter = event.params.subdelegationRules.notValidAfter;
  rule.customRule = event.params.subdelegationRules.customRule;
  rule.allowanceType = event.params.subdelegationRules.allowanceType;
  rule.allowance = event.params.subdelegationRules.allowance;
  recordSubDelegation(
    fromAddress,
    toAddress,
    rule,
    event.address,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash
  );
}

export function handleSubDelegations(event: SubDelegationsEvent): void {
  const fromAddress = event.params.from;
  const rule = new SubDelegationRuleObject();
  rule.maxRedelegations = event.params.subdelegationRules.maxRedelegations;
  rule.blocksBeforeVoteCloses =
    event.params.subdelegationRules.blocksBeforeVoteCloses;
  rule.notValidBefore = event.params.subdelegationRules.notValidBefore;
  rule.notValidAfter = event.params.subdelegationRules.notValidAfter;
  rule.customRule = event.params.subdelegationRules.customRule;
  rule.allowanceType = event.params.subdelegationRules.allowanceType;
  rule.allowance = event.params.subdelegationRules.allowance;
  for (let i = 0; i < event.params.to.length; i++) {
    const toAddress = event.params.to[i];
    recordSubDelegation(
      fromAddress,
      toAddress,
      rule,
      event.address,
      event.block.number,
      event.block.timestamp,
      event.transaction.hash
    );
  }
}

export function handleSubDelegations2(event: SubDelegations2Event): void {
  const fromAddress = event.params.from;
  for (let i = 0; i < event.params.to.length; i++) {
    const toAddress = event.params.to[i];
    const rule = new SubDelegationRuleObject();
    rule.maxRedelegations = event.params.subdelegationRules[i].maxRedelegations;
    rule.blocksBeforeVoteCloses =
      event.params.subdelegationRules[i].blocksBeforeVoteCloses;
    rule.notValidBefore = event.params.subdelegationRules[i].notValidBefore;
    rule.notValidAfter = event.params.subdelegationRules[i].notValidAfter;
    rule.customRule = event.params.subdelegationRules[i].customRule;
    rule.allowanceType = event.params.subdelegationRules[i].allowanceType;
    rule.allowance = event.params.subdelegationRules[i].allowance;
    recordSubDelegation(
      fromAddress,
      toAddress,
      rule,
      event.address,
      event.block.number,
      event.block.timestamp,
      event.transaction.hash
    );
  }
}

export function handlePolling(block: ethereum.Block): void {
  const now = block.timestamp.toU64();

  for (let timestamp = now; timestamp > now - 4; timestamp--) {
    const triggerContainer = SubDelegationTriggerContainer.load(
      timestamp.toString()
    );

    const triggers = triggerContainer?.triggers.load();

    if (triggers) {
      for (let i = 0; i < triggers.length; i++) {
        const trigger = triggers[i];
        const subdelegator = getSubDelegator(
          Address.fromString(trigger.from),
          Address.fromString(trigger.to)
        );
        updateSubDelegatorVotingPower(subdelegator, BigInt.fromU64(timestamp));
      }
    }
  }
}
