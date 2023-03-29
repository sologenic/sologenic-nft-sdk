import { SologenicBaseProps, Mode, NFT, SignTransactionOptions, FullNFTData, PublicCollection } from "../types";
import { Client, Wallet, Transaction, TxResponse } from "xrpl";
export declare class SologenicBaseModule {
    protected _moduleName: string;
    protected _moduleMode: Mode;
    protected _xrplClient: Client;
    protected _baseURL: string;
    protected _wallet: Wallet | null;
    protected _authHeaders: any;
    protected _clioClient: Client;
    constructor(props: SologenicBaseProps);
    getApiURL(): any;
    getWalletAddress(): string;
    setAccount(seed: string): Wallet;
    getNFT(nft_id: string): Promise<FullNFTData>;
    getMultipleNFTS(nft_ids: string[]): Promise<FullNFTData[]>;
    getCollection(collection_id: string): Promise<PublicCollection>;
    getMultipleCollections(collection_ids: string[]): Promise<PublicCollection[]>;
    countNFTCopies(nft_id: string): Promise<number>;
    getAccountNFTS(account?: string): Promise<NFT[]>;
    protected _checkWalletConnection(): Wallet;
    protected _setAuthHeaders(): void;
    protected _generateAuthToken(): string | void;
    protected _signTransaction(tx: Transaction, options?: SignTransactionOptions): Promise<string>;
    protected _submitSignedTxToLedger(tx_blob: string): Promise<TxResponse>;
    protected _checkConnection(client?: "clio" | "xrpl"): Promise<void>;
}
