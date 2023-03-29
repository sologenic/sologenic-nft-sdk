"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SologenicNFTTrader = void 0;
const xrpl_1 = require("xrpl");
const index_1 = require("../sologenic-base/index");
const errors_1 = __importDefault(require("../utils/errors"));
const index_2 = require("../utils/index");
const package_json_1 = require("../../package.json");
const axios_1 = __importDefault(require("axios"));
class SologenicNFTTrader extends index_1.SologenicBaseModule {
    constructor(props) {
        super(props);
        this._moduleName = "Trader";
        console.log(`Sologenic Trader Initialized: v${package_json_1.version}`);
    }
    // Add fetch NFT offers by NFT ID
    getNFTOffers(nft_id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this._checkConnection();
                const sell_offers = yield this._xrplClient
                    .request({
                    command: "nft_sell_offers",
                    nft_id: nft_id,
                })
                    .then((r) => r.result.offers)
                    .catch((e) => []);
                const buy_offers = yield this._xrplClient
                    .request({
                    command: "nft_buy_offers",
                    nft_id: nft_id,
                })
                    .then((r) => r.result.offers)
                    .catch((e) => []);
                return {
                    sell_offers: sell_offers,
                    buy_offers: buy_offers,
                };
            }
            catch (e) {
                throw e;
            }
        });
    }
    // Accept NFT Offer
    acceptOffer(offer, options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const wallet = this._checkWalletConnection();
                const accept_offer_tx = Object.assign({ TransactionType: "NFTokenAcceptOffer", Account: wallet.classicAddress }, (options.isBuy
                    ? {
                        NFTokenBuyOffer: typeof offer === "string" ? offer : offer.nft_offer_index,
                    }
                    : {
                        NFTokenSellOffer: typeof offer === "string" ? offer : offer.nft_offer_index,
                    }));
                const signed_tx = yield this._signTransaction(accept_offer_tx, {
                    autofill: true,
                });
                const result = yield this._submitSignedTxToLedger(signed_tx);
                return result;
            }
            catch (e) {
                throw e;
            }
        });
    }
    // Use Brokered mode
    brokerNFTOffers(args) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const wallet = this._checkWalletConnection();
                (0, index_2.validateOffersMatch)(args.sell_offer, args.buy_offer, wallet.classicAddress);
                const brokerFee = args.max_broker_fee
                    ? (0, index_2.getMaxBrokerFee)(args.sell_offer, args.buy_offer)
                    : args.broker_fee
                        ? args.broker_fee
                        : null;
                const brokered_tx = Object.assign({ Account: wallet.classicAddress, TransactionType: "NFTokenAcceptOffer", NFTokenBuyOffer: args.buy_offer.nft_offer_index, NFTokenSellOffer: args.sell_offer.nft_offer_index }, (brokerFee ? { NFTokenBrokerFee: brokerFee } : {}));
                const signed_tx = yield this._signTransaction(brokered_tx, {
                    autofill: true,
                });
                const result = yield this._submitSignedTxToLedger(signed_tx);
                return result;
            }
            catch (e) {
                throw e;
            }
        });
    }
    // Put NFT for sale
    setNFTForSale(nft_id, options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const wallet = this._checkWalletConnection();
                const { expiration = null, destination = null, amount } = options;
                const sell_offer_tx = Object.assign(Object.assign({ TransactionType: "NFTokenCreateOffer", NFTokenID: nft_id, Account: wallet.classicAddress, Flags: xrpl_1.NFTokenCreateOfferFlags.tfSellNFToken, Amount: amount }, (destination ? { Destination: destination } : {})), (expiration
                    ? {
                        Expiration: (0, index_2.convertToRippleTime)(expiration),
                    }
                    : {}));
                const signed_tx = yield this._signTransaction(sell_offer_tx, {
                    autofill: true,
                });
                const result = yield this._submitSignedTxToLedger(signed_tx);
                return result;
            }
            catch (e) {
                throw e;
            }
        });
    }
    // Place bid on NFT
    placeBidOnNFT(nft_id, options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const wallet = this._checkWalletConnection();
                if (options.amount.currency !== "xrp" && !options.amount.issuer)
                    throw errors_1.default.invalid_amount;
                const bid_tx = {
                    Account: wallet.classicAddress,
                    TransactionType: "NFTokenCreateOffer",
                    NFTokenID: nft_id,
                    Amount: options.amount.currency === "xrp"
                        ? (0, xrpl_1.xrpToDrops)(options.amount.value)
                        : options.amount,
                };
                const signed_tx = yield this._signTransaction(bid_tx, {
                    autofill: true,
                });
                const result = yield this._submitSignedTxToLedger(signed_tx);
                return result;
            }
            catch (e) {
                throw e;
            }
        });
    }
    // Cancel NFT Offer
    cancelNFTOffers(offers) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const wallet = this._checkWalletConnection();
                const cancel_tx = {
                    TransactionType: "NFTokenCancelOffer",
                    Account: wallet.classicAddress,
                    NFTokenOffers: offers,
                };
                const signed_tx = yield this._signTransaction(cancel_tx, {
                    autofill: true,
                });
                const result = yield this._submitSignedTxToLedger(signed_tx);
                return result;
            }
            catch (e) {
                throw e;
            }
        });
    }
    // Retrieve Collection Trading Data
    getCollectionTradingData(address) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const trading_data = yield (0, axios_1.default)({
                    method: "get",
                    baseURL: `${this._baseURL}/${index_2.services["nfts"]}/collections/${address}`,
                })
                    .then((r) => r.data.stats)
                    .catch((e) => {
                    throw e;
                });
                return trading_data;
            }
            catch (e) {
                throw e;
            }
        });
    }
    // Fetch NFT Trading History, this will only work for NFTs minted on the Sologenic Platform, or using the SologenicNFTManager
    getNFTTrades(nft_id, options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const trades = yield (0, axios_1.default)({
                    method: "get",
                    baseURL: `${this._baseURL}/${index_2.services["nfts"]}/nfts/${nft_id}/actions`,
                    params: Object.assign({ types: "nft_sold", limit: (options === null || options === void 0 ? void 0 : options.limit) ? options.limit : 50 }, ((options === null || options === void 0 ? void 0 : options.before_id) ? { before_id: options.before_id } : {})),
                })
                    .then((r) => r.data)
                    .catch((e) => {
                    throw e;
                });
                return trades;
            }
            catch (e) {
                throw e;
            }
        });
    }
}
exports.SologenicNFTTrader = SologenicNFTTrader;
