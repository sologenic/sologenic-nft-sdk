import { TxResponse } from "xrpl";
import { NFTOffer } from "xrpl/dist/npm/models/common/index";
import { SologenicBaseModule } from "../sologenic-base/index";
import { SologenicNFTTraderProps, AcceptOfferOptions, NFTSaleOptions, BrokeredModeArgs, Bid, NFTOffers, CollectionTradingData, NFTActionsOptions, NFTAction } from "../types";
export declare class SologenicNFTTrader extends SologenicBaseModule {
    _moduleName: string;
    constructor(props: SologenicNFTTraderProps);
    getNFTOffers(nft_id: string): Promise<NFTOffers>;
    acceptOffer(offer: NFTOffer | string, options: AcceptOfferOptions): Promise<TxResponse>;
    brokerNFTOffers(args: BrokeredModeArgs): Promise<TxResponse>;
    setNFTForSale(nft_id: string, options: NFTSaleOptions): Promise<TxResponse>;
    placeBidOnNFT(nft_id: string, options: Bid): Promise<TxResponse>;
    cancelNFTOffers(offers: string[]): Promise<TxResponse>;
    getCollectionTradingData(address: string): Promise<CollectionTradingData>;
    getNFTTrades(nft_id: string, options?: NFTActionsOptions): Promise<NFTAction[]>;
}
