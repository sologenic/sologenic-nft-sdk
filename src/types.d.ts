type NFTCategoryType = "art" | "motion" | "music" | "metaverse" | "sports" | "others" | "tradingcards" | "collectibles"

interface WalletInterface {
  address: string;
  seed: string;
}

interface SignTransactionOptions {
  autofill?: boolean;
  withClient?: boolean;
}
interface NFTokenMintResult {
  mint_tx_hash: string;
  NFTokenID: string;
}

interface CollectionData {
  name: string;
  cover?: Buffer;
  thumbnail?: Buffer;
  description?: string;
  transfer_fee?: number;
}

interface BurnConfiguration {
  burn_amount: string | number;
  burn_amount_issuance?: string | number;
  burn_amount_market_index?: string | number;
  burn_currency: string;
  burn_issuer: string;
}

interface BurnResult {
  address: string;
  hash: string;
  type?: string;
  burns_count: number;
  validated?: boolean;
}

interface NFTSlot {
  uid: string;
  [key: string]: unknown;
}

interface NFTAttribute {
  trait_type: string;
  value: string | number;
  max_value?: string | number;
}

interface NFTPayload {
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

interface SologenicMinterProps {
  wallet: WalletInterface;
  apiUrl: string;
  xrpl_node: string;
}

interface Collection {
  uid: string;
  issuer: string;
  nfts: NFTSlot[];
  [key: string]: unknown;
}
