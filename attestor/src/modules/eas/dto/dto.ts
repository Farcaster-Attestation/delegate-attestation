import { Transaction } from '@ethereum-attestation-service/eas-sdk';

export interface AttestRequestData {
  recipient: string;
  datas: AttestData[];
  expirationTime?: number;
  revocable?: boolean;
  refUID?: string;
  value?: number;
}

export interface AttestData {
  name: string;
  value: number | string | unknown[];
  type: string;
}

export interface AttestResult {
  txhash: string;
  easId: string;
  tx: Transaction<string[]>;
}
