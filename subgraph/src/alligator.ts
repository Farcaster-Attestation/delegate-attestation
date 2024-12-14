import {
  SubDelegation as SubdelegationEvent,
  SubDelegations as SubDelegationsEvent,
  SubDelegations1 as SubDelegations2Event,
} from "../generated/AlligatorOPV5/AlligatorOPV5";

export function handleSubDelegation(event: SubdelegationEvent): void {}
export function handleSubDelegations(event: SubDelegationsEvent): void {}
export function handleSubDelegations2(event: SubDelegations2Event): void {}
