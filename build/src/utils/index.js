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
exports.getAllAccountNFTS = exports.getBase64 = exports.encodeNFTTokenID = exports.toHex = exports.convertToRippleTime = exports.getMaxBrokerFee = exports.validateOffersMatch = exports.parseAmount = exports.services = exports.clio_servers = exports.modes = exports.categories = void 0;
const lodash_1 = require("lodash");
const errors_1 = __importDefault(require("./errors"));
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const xrpl_1 = require("xrpl");
exports.categories = [
    "art",
    "motion",
    "music",
    "metaverse",
    "sports",
    "others",
    "tradingcards",
    "collectibles",
];
exports.modes = {
    mainnet: "https://api.sologenic.org/api/v1",
    devnet: "https://api-devnet.test.sologenic.org/api/v1",
    testnet: "https://api-testnet.test.sologenic.org/api/v1",
};
exports.clio_servers = {
    mainnet: "wss://s2-clio.ripple.com:51233/",
    testnet: "wss://clio.altnet.rippletest.net:51233/",
    devnet: "wss://clio.devnet.rippletest.net:51233/",
};
exports.services = {
    mint: "nft-minter",
    nfts: "nft-marketplace",
};
const parseAmount = (amount) => {
    let amount_fields = { value: 0, currency: "" };
    if (typeof amount === "string") {
        amount_fields.currency = "xrp";
        amount_fields.value = (0, xrpl_1.dropsToXrp)(amount);
    }
    else {
        amount_fields = amount;
    }
    return amount_fields;
};
exports.parseAmount = parseAmount;
// Validate NFT Offers and if they match
const validateOffersMatch = (sell_offer, buy_offer, broker_address) => {
    if (sell_offer.flags !== 1)
        throw errors_1.default.sell_offer_invalid;
    if (buy_offer.flags === 1)
        throw errors_1.default.buy_offer_invalid;
    if (sell_offer.destination &&
        ![...(broker_address ? [broker_address] : []), buy_offer.owner].includes(sell_offer.destination))
        throw errors_1.default.sell_destination_invalid;
    const parsedSell = (0, exports.parseAmount)(sell_offer.amount);
    const parsedBuy = (0, exports.parseAmount)(buy_offer.amount);
    if (parsedSell.currency !== parsedBuy.currency ||
        parsedSell.issuer !== parsedBuy.issuer ||
        parsedSell.value > parsedBuy.value)
        throw errors_1.default.offers_not_match;
};
exports.validateOffersMatch = validateOffersMatch;
// Get Max Broker Fee
function getMaxBrokerFee(sell_offer, buy_offer) {
    try {
        const parsedSell = (0, exports.parseAmount)(sell_offer.amount);
        const parsedBuy = (0, exports.parseAmount)(buy_offer.amount);
        const bigSell = new bignumber_js_1.default(parsedSell.amount.value);
        const bigBuy = new bignumber_js_1.default(parsedBuy.amount.value);
        const difference = bigSell.minus(bigBuy);
        const brokerFee = parsedSell.currency === "xrp"
            ? (0, xrpl_1.xrpToDrops)(difference.toNumber())
            : {
                value: difference.toString(),
                currency: parsedSell.currency,
                issuer: parsedSell.issuer,
            };
        return brokerFee;
    }
    catch (e) {
        throw e;
    }
}
exports.getMaxBrokerFee = getMaxBrokerFee;
// Convert to Ripple Time
const convertToRippleTime = (time) => {
    if ((0, lodash_1.isNumber)(time))
        return (0, xrpl_1.unixTimeToRippleTime)(time);
    return (0, xrpl_1.isoTimeToRippleTime)(time);
};
exports.convertToRippleTime = convertToRippleTime;
// Helper function to convert to Hex
const toHex = (string) => {
    const s = unescape(encodeURIComponent(string));
    let h = "";
    for (let i = 0; i < s.length; i++) {
        h += s.charCodeAt(i).toString(16);
    }
    return h;
};
exports.toHex = toHex;
function unscrambleTaxon(taxon, tokenSeq) {
    return (taxon ^ (384160001 * tokenSeq + 2459)) % 4294967296;
}
const encodeNFTTokenID = (flags, royalty, issuer, taxon, nftsequence) => {
    const encodedFlags = flags.toString(16).toUpperCase().padStart(4, "0");
    const encodedRoyalty = royalty.toString(16).toUpperCase().padStart(4, "0");
    const encodedIssuer = (0, xrpl_1.decodeAccountID)(issuer).toString("hex").toUpperCase();
    const encodedTaxon = (unscrambleTaxon(taxon, nftsequence) >>> 0)
        .toString(16)
        .toUpperCase()
        .padStart(8, "0");
    const encodedSequence = nftsequence
        .toString(16)
        .toUpperCase()
        .padStart(8, "0");
    return (encodedFlags +
        encodedRoyalty +
        encodedIssuer +
        encodedTaxon +
        encodedSequence);
};
exports.encodeNFTTokenID = encodeNFTTokenID;
function getBase64(file) {
    return __awaiter(this, void 0, void 0, function* () {
        const fileReader = yield import("file-type");
        const fileType = yield fileReader.fileTypeFromBuffer(file);
        const dataPrefix = `data:${fileType.mime};base64,`;
        return dataPrefix + file.toString("base64");
    });
}
exports.getBase64 = getBase64;
function getAllAccountNFTS(client, address, marker) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            var nfts = [];
            yield client
                .request(Object.assign({ command: "account_nfts", account: address, limit: 100 }, (marker ? { marker } : {})))
                .then((r) => __awaiter(this, void 0, void 0, function* () {
                nfts = [...r.result.account_nfts];
                if (r.result.marker) {
                    nfts = [
                        ...nfts,
                        ...(yield getAllAccountNFTS(client, address, r.result.marker)),
                    ];
                }
            }))
                .catch((e) => {
                throw e;
            });
            return nfts;
        }
        catch (e) {
            console.log("E_GET_ACCOUNT_NFTS_UTILS =>", e);
            throw e;
        }
    });
}
exports.getAllAccountNFTS = getAllAccountNFTS;
