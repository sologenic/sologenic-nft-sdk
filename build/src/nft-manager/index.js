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
exports.SologenicNFTManager = void 0;
const package_json_1 = require("../../package.json");
const axios_1 = __importDefault(require("axios"));
const index_1 = require("../utils/index");
const errors_1 = __importDefault(require("../utils/errors"));
const index_2 = require("../sologenic-base/index");
class SologenicNFTManager extends index_2.SologenicBaseModule {
    constructor(props) {
        super(props);
        this._moduleName = "manager";
        this._collectionData = null;
        this._collectionAddress = null;
        console.log(`Sologenic Manager Initialized: v${package_json_1.version}`);
    }
    getCollectionAddress() {
        try {
            if (this._collectionAddress)
                return this._collectionAddress;
            throw errors_1.default.collection_not_set;
        }
        catch (e) {
            throw e;
        }
    }
    getCollectionNFTSlots() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this._collectionAddress) {
                    this._collectionData = yield this._getCollectionData();
                    return this._collectionData.nfts;
                }
                throw errors_1.default.collection_not_set;
            }
            catch (e) {
                throw e;
            }
        });
    }
    getCollectionData() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this._collectionAddress) {
                    return (this._collectionData = yield this._getCollectionData());
                }
                throw errors_1.default.collection_not_set;
            }
            catch (e) {
                throw e;
            }
        });
    }
    getAllCollections() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this._checkWalletConnection();
                const collections = yield (0, axios_1.default)({
                    method: "get",
                    headers: this._authHeaders,
                    baseURL: `${this._baseURL}/${index_1.services.mint}/collection/all`,
                })
                    .then((r) => {
                    const colls = r.data.response.map((c) => {
                        delete c.locked_at;
                        delete c.minted_at;
                        delete c.only_xrp;
                        delete c.minted;
                        return c;
                    });
                    return colls;
                })
                    .catch((e) => {
                    throw e;
                });
                return collections;
            }
            catch (e) {
                throw e;
            }
        });
    }
    generateNFTSlots(amount) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const wallet = this._checkWalletConnection();
                yield this._xrplClient.connect();
                const burnConfig = yield this.getBurnConfiguration();
                const payment_tx = {
                    Account: wallet.classicAddress,
                    TransactionType: "Payment",
                    Amount: {
                        currency: burnConfig.burn_currency,
                        issuer: burnConfig.burn_issuer,
                        value: String(amount * Number(burnConfig.burn_amount)),
                    },
                    Destination: burnConfig.burn_issuer,
                    Memos: [
                        {
                            Memo: {
                                MemoData: (0, index_1.toHex)(JSON.stringify({ type: "mint" })),
                            },
                        },
                    ],
                };
                const signed_payment = yield this._signTransaction(payment_tx, {
                    autofill: true,
                });
                const result = yield this._submitSignedTxToLedger(signed_payment);
                const burn_result = yield this._submitBurnTxHash(result.result.hash);
                if (this._collectionAddress)
                    this._collectionData = yield this._getCollectionData();
                delete burn_result.type;
                delete burn_result.validated;
                return burn_result;
            }
            catch (e) {
                throw e;
            }
        });
    }
    createCollection(collectionData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this._checkWalletConnection();
                const new_collection = yield (0, axios_1.default)({
                    method: "post",
                    baseURL: `${this._baseURL}/${index_1.services.mint}/collection/assemble`,
                    headers: this._authHeaders,
                })
                    .then((r) => r.data.response)
                    .catch((e) => {
                    throw e;
                });
                yield this.setCollectionAddress(new_collection.issuer);
                yield this.updateCollection(collectionData);
                return this._collectionData;
            }
            catch (e) {
                throw e;
            }
        });
    }
    updateCollection(collectionData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this._checkWalletConnection();
                if (!this._collectionData)
                    throw errors_1.default.collection_not_set;
                yield (0, axios_1.default)({
                    method: "post",
                    baseURL: `${this._baseURL}/${index_1.services.mint}/collection/cover`,
                    data: Object.assign(Object.assign(Object.assign(Object.assign({}, collectionData), (collectionData.cover
                        ? { cover: yield (0, index_1.getBase64)(collectionData.cover) }
                        : { cover: "" })), (collectionData.thumbnail
                        ? { thumbnail: yield (0, index_1.getBase64)(collectionData.thumbnail) }
                        : { thumbnail: "" })), { uid: this._collectionData.uid, issuer: this._collectionAddress }),
                    headers: this._authHeaders,
                })
                    .then((r) => r.data.response.updated)
                    .catch((e) => {
                    if (e.response.data.response.error.message === "invalid_issuing_address")
                        throw errors_1.default.collection_already_sealed;
                    throw e;
                });
                return (this._collectionData = yield this._getCollectionData());
            }
            catch (e) {
                throw e;
            }
        });
    }
    setCollectionAddress(address) {
        return __awaiter(this, void 0, void 0, function* () {
            this._collectionAddress = address;
            this._collectionData = yield this._getCollectionData();
        });
    }
    mint(nftData, options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this._checkWalletConnection();
                console.info("Starting minting process...");
                // If collection address has not been set, throw error
                if (!this._collectionAddress)
                    throw errors_1.default.collection_not_set;
                // Upload NFT Data
                const uploaded_nft_uid = yield this._uploadNFTData(nftData);
                // Make sure collection is shipped
                yield this._shipCollection();
                // Request NFTokenMint Transaction
                const mintTx = yield this._prepareMintTransaction(uploaded_nft_uid, options === null || options === void 0 ? void 0 : options.onBehalf);
                // Sign NFTokenMint Transaction
                const tx_blob = yield this._signTransaction(mintTx, {
                    autofill: true,
                });
                // Submit Signed Transaction and receive nftoken_id of submitted transaction
                const nft_result = yield this._submitSignedMintTx(tx_blob, uploaded_nft_uid);
                this._collectionData = yield this._getCollectionData();
                return nft_result;
            }
            catch (e) {
                if (e.error === errors_1.default.nft_slots_not_available.error) {
                    if (options === null || options === void 0 ? void 0 : options.autoBurn) {
                        yield this.generateNFTSlots(1);
                        const minted = yield this.mint(nftData, options);
                        return minted;
                    }
                    throw e;
                }
                throw e;
            }
        });
    }
    mintMultipleCopies(nftData, options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this._checkWalletConnection();
                console.info(`Starting mint of ${options.numberOfCopies} copies`);
                let minted_nfts = [];
                let error = null;
                for (var i = 0; i < options.numberOfCopies; i++) {
                    try {
                        console.info("Minting copy #", i + 1);
                        const minted = yield this.mint(nftData, {
                            onBehalf: options.onBehalf,
                        });
                        minted_nfts.push(minted);
                    }
                    catch (e) {
                        if (e.error === errors_1.default.nft_slots_not_available.error) {
                            if (options === null || options === void 0 ? void 0 : options.autoBurn) {
                                yield this.generateNFTSlots(1);
                                const minted = yield this.mint(nftData, {
                                    onBehalf: options.onBehalf,
                                });
                                minted_nfts.push(minted);
                            }
                            else {
                                error = {
                                    message: e.message,
                                };
                                break;
                            }
                        }
                        else {
                            error = {
                                message: e.message,
                            };
                            break;
                        }
                    }
                }
                return {
                    copies_minted: minted_nfts.length,
                    nfts: minted_nfts,
                    error,
                };
            }
            catch (e) {
                throw e;
            }
        });
    }
    getBurnConfiguration() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.info("Getting Burn Configuration...");
                const burn_config = yield (0, axios_1.default)({
                    method: "get",
                    baseURL: `${this._baseURL}/${index_1.services.mint}/solo/burn_config`,
                })
                    .then((r) => r.data)
                    .catch((e) => {
                    throw e;
                });
                delete burn_config.burn_amount_issuance;
                delete burn_config.burn_amount_market_index;
                return burn_config;
            }
            catch (e) {
                throw e;
            }
        });
    }
    getNFTActions(nft_id, options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const typesFilter = (options === null || options === void 0 ? void 0 : options.types) ? options.types.join("&types=") : null;
                const actions = yield (0, axios_1.default)({
                    method: "get",
                    baseURL: `${this._baseURL}/${index_1.services["nfts"]}/nfts/${nft_id}/actions${typesFilter ? `?types=${typesFilter}` : ""}`,
                    params: Object.assign({ limit: (options === null || options === void 0 ? void 0 : options.limit) ? options.limit : 50 }, ((options === null || options === void 0 ? void 0 : options.before_id) ? { before_id: options.before_id } : {})),
                })
                    .then((r) => r.data)
                    .catch((e) => {
                    throw e;
                });
                return actions;
            }
            catch (e) {
                throw e;
            }
        });
    }
    // Private Methods
    _getEmptyNFTSlot() {
        var _a;
        console.info("Getting next available NFT slot...");
        const collection = this._collectionData;
        if (collection.nfts.length === 0)
            throw errors_1.default.nft_slots_not_available;
        const nft_slot = (_a = this._collectionData) === null || _a === void 0 ? void 0 : _a.nfts.find((slot) => slot.currency === null);
        if (!nft_slot)
            throw errors_1.default.nft_slots_not_available;
        return nft_slot;
    }
    _submitBurnTxHash(tx_hash) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = (0, axios_1.default)({
                    method: "post",
                    baseURL: `${this._baseURL}/${index_1.services.mint}/solo/burn`,
                    headers: this._authHeaders,
                    data: {
                        hash: tx_hash,
                        type: "mint",
                    },
                })
                    .then((r) => {
                    return r.data;
                })
                    .catch((e) => {
                    throw e;
                });
                return response;
            }
            catch (e) {
                throw e;
            }
        });
    }
    _submitSignedMintTx(tx_blob, nft_uid) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.info("Submitting Signed Transaction...");
                const tx_hash = (0, axios_1.default)({
                    baseURL: `${this._baseURL}/${index_1.services.mint}/nft/mint`,
                    method: "post",
                    data: {
                        mint_tx_blob: tx_blob,
                        uid: nft_uid,
                    },
                    headers: this._authHeaders,
                })
                    .then((r) => __awaiter(this, void 0, void 0, function* () {
                    var _a;
                    yield this._xrplClient.connect();
                    const tx = yield this._xrplClient.request({
                        command: "tx",
                        transaction: r.data.response.hash,
                    });
                    const nftsequence = tx.result.meta.AffectedNodes.find((an) => {
                        if (an.ModifiedNode &&
                            an.ModifiedNode.LedgerEntryType === "AccountRoot" &&
                            an.ModifiedNode.FinalFields.Account ===
                                (tx.result.Issuer ? tx.result.Issuer : tx.result.Account)) {
                            return an;
                        }
                    });
                    const nftTokenID = (0, index_1.encodeNFTTokenID)(tx.result.Flags, tx.result.TransferFee, tx.result.Issuer ? tx.result.Issuer : tx.result.Account, tx.result.NFTokenTaxon, (_a = nftsequence.ModifiedNode.PreviousFields.MintedNFTokens) !== null && _a !== void 0 ? _a : 0);
                    return {
                        mint_tx_hash: r.data.response.hash,
                        NFTokenID: nftTokenID,
                    };
                }))
                    .catch((e) => {
                    throw e;
                });
                return tx_hash;
            }
            catch (e) {
                throw e;
            }
        });
    }
    _prepareMintTransaction(nftUID, onBehalf) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.info("Preparing NFTokenMint Transaction...");
                const mint_transaction = yield (0, axios_1.default)({
                    baseURL: `${this._baseURL}/${index_1.services.mint}/nft/prepareMint`,
                    method: "post",
                    headers: this._authHeaders,
                    data: Object.assign({ uid: nftUID }, (onBehalf ? { on_behalf: onBehalf } : {})),
                })
                    .then((r) => r.data.response.tx)
                    .catch((e) => {
                    throw e;
                });
                return mint_transaction;
            }
            catch (e) {
                throw e;
            }
        });
    }
    _uploadNFTData(nftData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const nftSlot = this._getEmptyNFTSlot();
                console.info("Uploading NFT data...");
                console.info("Using NFT Slot => ", nftSlot);
                yield (0, axios_1.default)({
                    baseURL: `${this._baseURL}/${index_1.services.mint}/nft/upload`,
                    method: "post",
                    headers: this._authHeaders,
                    data: {
                        issuer: this._collectionAddress,
                        payload: Object.assign(Object.assign({}, nftData), { file: yield (0, index_1.getBase64)(nftData.file), thumbnail: yield (0, index_1.getBase64)(nftData.thumbnail) }),
                        uid: nftSlot.uid,
                    },
                })
                    .then((r) => r.data)
                    .catch((e) => {
                    throw e;
                });
                return nftSlot.uid;
            }
            catch (e) {
                throw e;
            }
        });
    }
    _shipCollection() {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const shipped = yield (0, axios_1.default)({
                    baseURL: `${this._baseURL}/${index_1.services.mint}/collection/ship`,
                    method: "post",
                    data: {
                        issuer: this._collectionAddress,
                        standard: "xls20d",
                    },
                    headers: this._authHeaders,
                });
                if ((_b = (_a = shipped.data) === null || _a === void 0 ? void 0 : _a.response) === null || _b === void 0 ? void 0 : _b.shipped)
                    return true;
                throw errors_1.default.unknown;
            }
            catch (e) {
                throw e;
            }
        });
    }
    _getCollectionData() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this._checkWalletConnection();
                if (this._collectionAddress) {
                    console.info("Getting Collection Data...");
                    const collection = yield (0, axios_1.default)({
                        url: `${this._baseURL}/${index_1.services.mint}/collection/assemble`,
                        method: "post",
                        headers: this._authHeaders,
                        data: { issuer: this._collectionAddress },
                    })
                        .then((res) => res.data.response)
                        .catch((e) => {
                        throw e;
                    });
                    delete collection.activated;
                    delete collection.activation_fee;
                    delete collection.burn_amount;
                    delete collection.burn_address;
                    delete collection.burn_currency;
                    return collection;
                }
                throw errors_1.default.collection_not_set;
            }
            catch (e) {
                throw e;
            }
        });
    }
}
exports.SologenicNFTManager = SologenicNFTManager;
