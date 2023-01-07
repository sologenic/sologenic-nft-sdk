import { Amount, NFTOffer } from "xrpl/dist/npm/models/common/index";

export type NFTCategoryType =
  | "art"
  | "motion"
  | "music"
  | "metaverse"
  | "sports"
  | "others"
  | "tradingcards"
  | "collectibles";

export type Mode = "devnet" | "mainnet" | "testnet";

export interface AcceptOfferOptions {
  isBuy: boolean;
}

export interface ParsedAmount {
  value: string | number;
  currency: string;
  issuer?: string;
}

export interface Bid {
  expiration?: number | Date | string;
  amount: ParsedAmount;
}
export interface NFTSaleOptions {
  amount: Amount;
  expiration?: number | Date | string;
  destination?: string;
}

export interface Price {
  [key: string]: number | string;
}

export interface Stats {
  "7d": number | string;
  "24h": number | string;
  "30d": number | string;
  all_time: number | string;
}

export interface StatsInterface {
  [key: string]: Stats;
}

export type NFTActionType =
  | "nft_minted"
  | "nft_offer_created"
  | "nft_sale_started"
  | "nft_sale_cancelled"
  | "nft_offer_cancelled"
  | "nft_sold"
  | "nft_transferred"
  | "nft_destroyed";

export interface NFTAction {
  type: NFTActionType;
  account: string;
  id: string;
  nft_id: string;
  txid: string;
  happened_at: string;
  standard: "XLS-20d" | "XLS-14d";
  from_account?: string;
  to_account?: string;
  quote_amount?: number | string;
  quote_currency?: string;
  quote_issuer?: string;
  is_standard_migration?: boolean;
  minter?: string;
}

export interface CollectionTradingData {
  floor_price: Price;
  nft_count: number;
  owner_count: number;
  volume: StatsInterface;
}

export interface NFT {
  Flags: number;
  Issuer: string;
  NFTokenID: string;
  NFTokenTaxon: number;
  URI?: string;
  nft_serial: number;
}

export interface BrokeredModeArgs {
  nft_id: string;
  sell_offer: NFTOffer;
  buy_offer: NFTOffer;
  max_broker_fee?: boolean;
  broker_fee?: Amount;
}

export interface NFTOffers {
  buy_offers: NFTOffer[];
  sell_offers: NFTOffer[];
}

export interface NFTActionsOptions {
  before_id?: number | string;
  limit?: number;
  types?: NFTActionType[];
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

export interface NFTClio {
  nft_id: string;
  ledger_index: number;
  owner: string;
  issuer: string;
  is_burned?: boolean;
  flags?: number;
  transfer_fee?: number;
  nft_taxon?: number;
  nft_sequence?: number;
  uri?: string;
  validated: boolean;
}

export interface FullNFTData {
  sologenic_info: NFTData | null;
  xrpl_info: NFTClio;
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

export interface SologenicNFTManagerProps extends SologenicBaseProps {}

export interface SologenicNFTTraderProps extends SologenicBaseProps {}

export interface SologenicBaseProps {
  mode: Mode;
  xrpl_node: string;
}

export interface Collection {
  uid: string;
  issuer: string;
  nfts: NFTSlot[];
  [key: string]: unknown;
}
