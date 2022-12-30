export interface WalletInterface {
  address: string;
  seed: string;
}

export interface SignTransactionOptions {
  autofill?: boolean;
}
export interface NFTokenMintResult {
  mint_tx_hash: string;
  NFTokenID: string;
}

export interface NFTSlot {
  uid: string;
  [key: string]: unknown;
}

export interface NFTAttribute {
  trait_type: string;
  value: string | number;
  max_value?: string | number;
}

export interface NFTPayload {
  file: string;
  thumbnail: string;
  name: string;
  category: string;
  is_explicit: boolean;
  only_xrp: boolean;
  transfer_fee?: number; // A number between 0 and 50000 i.e to get 10% royalty transfer_fee must be 10000
  description?: string;
  external_url?: string;
  attributes?: NFTAttribute[];
}

export interface SologenicMinterProps {
  wallet: WalletInterface;
  apiUrl: string;
  xrpl_node: string;
}

export interface Collection {
  uid: string;
  issuer: string;
  nfts: NFTSlot[];
  [key: string]: unknown;
}
