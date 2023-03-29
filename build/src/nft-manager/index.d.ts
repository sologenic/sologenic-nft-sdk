import { Collection, SologenicNFTManagerProps, CollectionData, NFTSlot, NFTokenMintResult, NFTPayload, BurnResult, BurnConfiguration, MintMultipleCopiesOptions, MintMultipleCopiesResult, MintOptions, NFTActionsOptions, NFTAction } from "../types";
import { SologenicBaseModule } from "../sologenic-base/index";
export declare class SologenicNFTManager extends SologenicBaseModule {
    _moduleName: string;
    private _collectionData;
    private _collectionAddress;
    constructor(props: SologenicNFTManagerProps);
    getCollectionAddress(): string;
    getCollectionNFTSlots(): Promise<NFTSlot[]>;
    getCollectionData(): Promise<Collection>;
    getAllCollections(): Promise<Collection[]>;
    generateNFTSlots(amount: number): Promise<BurnResult>;
    createCollection(collectionData: CollectionData): Promise<Collection>;
    updateCollection(collectionData: CollectionData): Promise<Collection>;
    setCollectionAddress(address: string): Promise<void>;
    mint(nftData: NFTPayload, options?: MintOptions): Promise<NFTokenMintResult>;
    mintMultipleCopies(nftData: NFTPayload, options: MintMultipleCopiesOptions): Promise<MintMultipleCopiesResult>;
    getBurnConfiguration(): Promise<BurnConfiguration>;
    getNFTActions(nft_id: string, options?: NFTActionsOptions): Promise<NFTAction[]>;
    private _getEmptyNFTSlot;
    private _submitBurnTxHash;
    private _submitSignedMintTx;
    private _prepareMintTransaction;
    private _uploadNFTData;
    private _shipCollection;
    private _getCollectionData;
}
