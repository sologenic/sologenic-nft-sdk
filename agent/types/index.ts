export interface Wallet {
  address: string;
  seed: string;
}

export interface NFTSlot {
  uid: string;
  [key: string]: unknown;
}

export interface MinterAgentProps {
  wallet: Wallet;
  apiUrl: string;
  collectionAddress: string;
}

export interface Collection {
  uid: string;
  issuer: string;
  nfts: NFTSlot[];
  [key: string]: unknown;
}
