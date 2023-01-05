import { AxiosRequestHeaders } from "axios";

export type NFTCategoryType =
  | "art"
  | "motion"
  | "music"
  | "metaverse"
  | "sports"
  | "others"
  | "tradingcards"
  | "collectibles";

export type MinterMode = "devnet" | "mainnet" | "testnet";

export interface NFT {
  Flags: number;
  Issuer: string;
  NFTokenID: string;
  NFTokenTaxon: number;
  URI?: string;
  nft_serial: number;
}

export interface NFTMetadata {
  animation_url?: string;
  category: NFTCategoryType;
  content_type: string;
  description: string;
  external_url: string;
  image_url: string;
  is_explicit: boolean;
  md5hash: string;
  name: string;
}

export interface NFTData {
  id: string;
  standard: string;
  collection_id: string;
  minter: string;
  owner: string;
  ipfs_cid: string;
  md5_hash: string;
  minted_txid: string;
  metadata: NFTMetadata;
}

export interface SignTransactionOptions {
  autofill?: boolean;
  withClient?: boolean;
}

export interface MintMultipleCopiesOptions {
  numberOfCopies: number;
  autoBurn?: boolean;
  onBehalf?: string;
}

export interface MintOptions {
  autoBurn?: boolean;
  onBehalf?: string;
}

export interface MintMultipleCopiesResult {
  copies_minted: number;
  nfts: NFTokenMintResult[];
  error?: any;
}

export interface NFTokenMintResult {
  mint_tx_hash: string;
  NFTokenID: string;
}

export interface CollectionData {
  name: string;
  cover?: Buffer;
  thumbnail?: Buffer;
  description?: string;
  transfer_fee?: number;
}

export interface BurnConfiguration {
  burn_amount: string | number;
  burn_amount_issuance?: string | number;
  burn_amount_market_index?: string | number;
  burn_currency: string;
  burn_issuer: string;
}

export interface BurnResult {
  address: string;
  hash: string;
  type?: string;
  burns_count: number;
  validated?: boolean;
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
  file: Buffer;
  thumbnail: Buffer;
  name: string;
  category: NFTCategoryType;
  is_explicit: boolean;
  only_xrp: boolean;
  transfer_fee?: number; // A number between 0 and 50000 i.e to get 10% royalty transfer_fee must be 10000
  description?: string;
  external_url?: string;
  attributes?: NFTAttribute[];
}

export interface SologenicMinterProps {
  mode: MinterMode;
  xrpl_node: string;
}

export interface Collection {
  uid: string;
  issuer: string;
  nfts: NFTSlot[];
  [key: string]: unknown;
}
