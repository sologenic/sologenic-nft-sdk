/// <reference types="node" />
import { Amount, NFTOffer } from "xrpl/dist/npm/models/common/index";
import { NFT } from "../types";
import { Client } from "xrpl";
export declare const categories: string[];
export declare const modes: {
    mainnet: string;
    devnet: string;
    testnet: string;
};
export declare const clio_servers: {
    mainnet: string;
    testnet: string;
    devnet: string;
};
export declare const services: {
    mint: string;
    nfts: string;
};
export declare const parseAmount: (amount: Amount) => any;
export declare const validateOffersMatch: (sell_offer: NFTOffer, buy_offer: NFTOffer, broker_address?: string) => void;
export declare function getMaxBrokerFee(sell_offer: NFTOffer, buy_offer: NFTOffer): Amount;
export declare const convertToRippleTime: (time: number | Date | string) => number;
export declare const toHex: (string: string) => string;
export declare const encodeNFTTokenID: (flags: number, royalty: number, issuer: string, taxon: number, nftsequence: number) => string;
export declare function getBase64(file: Buffer): Promise<any>;
export declare function getAllAccountNFTS(client: Client, address: string, marker?: string): Promise<NFT[]>;
