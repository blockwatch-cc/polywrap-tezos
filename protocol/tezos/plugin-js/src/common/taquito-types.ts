/**
 * @docs
 * Contains internal types not exported by taquito
 */

import { OpKind } from "@taquito/taquito";

export interface TransferParamsWithTransactionKind extends TransferParams {
  kind: OpKind.TRANSACTION
}

export interface BlockResponse {
  chain_id: string;
  hash: string;
  protocol: string;
}

export interface TransferConfirmationResponse {
  completed: boolean;
  currentConfirmation: number;
  expectedConfirmation: number;
  block: BlockResponse;
  isInCurrentBranch: () => Promise<boolean>;
}

export interface Estimate {
  burnFeeMutez: number;
  gasLimit: number;
  minimalFeeMutez: number;
  opSize: number | string;
  storageLimit: number;
  suggestedFeeMutez: number;
  totalCost: number;
  usingBaseFeeMutez: number;
  consumedMilligas: number;
}

export interface RevealParams {
  fee?: number;
  gasLimit?: number;
  storageLimit?: number;
}

export interface SendParams {
  to: string;
  amount: number;
  source?: string;
  fee?: number;
  gasLimit?: number;
  storageLimit?: number;
  mutez?: boolean;
}

export interface TransferParams extends SendParams {
  parameter?: any;
}

export interface OriginateParams {
  code: string;
  storage: any;
  balance?: string;
  delegate?: string;
  fee?: number;
  gasLimit?: number;
  storageLimit?: number;
  mutez?: boolean;
  init?: string;
}

export interface Sign {
  bytes: string;
  sig: string;
  prefixSig: string;
  sbytes: string;
}
