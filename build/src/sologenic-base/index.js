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
exports.SologenicBaseModule = void 0;
const types_1 = require("../types");
const xrpl_1 = require("xrpl");
const errors_1 = __importDefault(require("../utils/errors"));
const index_1 = require("../utils/index");
const moment_1 = __importDefault(require("moment"));
const axios_1 = __importDefault(require("axios"));
const index_2 = require("../utils/index");
class SologenicBaseModule {
    constructor(props) {
        this._moduleName = "base";
        this._wallet = null;
        this._authHeaders = null;
        if (!props.mode)
            throw Object.assign(Object.assign({}, errors_1.default.property_missing), { message: errors_1.default.property_missing.message + "mode" });
        if (!props.xrpl_node)
            throw Object.assign(Object.assign({}, errors_1.default.property_missing), { message: errors_1.default.property_missing.message + "xrpl_node" });
        this._moduleMode = props.mode;
        this._xrplClient = new xrpl_1.Client(props.xrpl_node);
        this._clioClient = new xrpl_1.Client(index_1.clio_servers[props.mode]);
        this._baseURL = index_1.modes[props.mode];
    }
    getApiURL() {
        return {
            mode: this._moduleMode,
            url: index_1.modes[this._moduleMode],
        };
    }
    getWalletAddress() {
        try {
            const wallet = this._checkWalletConnection();
            return wallet.classicAddress;
        }
        catch (e) {
            throw e;
        }
    }
    setAccount(seed) {
        this._wallet = xrpl_1.Wallet.fromSecret(seed);
        this._setAuthHeaders();
        setInterval(this._setAuthHeaders.bind(this), 60000);
        return this._wallet;
    }
    getNFT(nft_id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this._checkConnection();
                yield this._checkConnection("clio");
                const nft_info = yield this._clioClient.request({
                    command: "nft_info",
                    nft_id,
                });
                const nft_data = yield (0, axios_1.default)({
                    method: "get",
                    baseURL: `${this._baseURL}/${index_2.services.nfts}/nfts/${nft_id}`,
                })
                    .then((r) => {
                    delete r.data.internal_id;
                    return r.data;
                })
                    .catch((e) => {
                    if (e.response.status === 404)
                        return null;
                    throw e;
                });
                return {
                    sologenic_info: nft_data,
                    xrpl_info: nft_info.result,
                };
            }
            catch (e) {
                throw e;
            }
        });
    }
    getMultipleNFTS(nft_ids) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this._checkConnection();
                yield this._checkConnection("clio");
                return yield (0, axios_1.default)({
                    method: "post",
                    url: `${this._baseURL}/${index_2.services.nfts}/nfts`,
                    data: nft_ids,
                })
                    .then((r) => {
                    const n = r.data.ids.map((x) => __awaiter(this, void 0, void 0, function* () {
                        let xrpl_info;
                        if (x.standard === types_1.NFTStandard.XLS20) {
                            try {
                                const nft_info = yield this._clioClient.request({
                                    command: "nft_info",
                                    nft_id: x.id,
                                });
                                xrpl_info = nft_info.result;
                            }
                            catch (e) {
                                console.log(e);
                            }
                        }
                        return { sologenic_info: x, xrpl_info };
                    }));
                    return n;
                })
                    .catch((e) => {
                    throw e;
                });
            }
            catch (e) {
                throw e;
            }
        });
    }
    getCollection(collection_id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const c = yield (0, axios_1.default)({
                    method: "get",
                    url: `${this._baseURL}/${index_2.services.nfts}/collections/${collection_id}`,
                });
                return c.data;
            }
            catch (e) {
                throw e;
            }
        });
    }
    getMultipleCollections(collection_ids) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (collection_ids.length > 20)
                    throw new Error("Maximum collection_ids per request: 20");
                const encoded = window
                    ? window.btoa(JSON.stringify(collection_ids))
                    : Buffer.from(JSON.stringify(collection_ids)).toString("base64");
                const colls = yield (0, axios_1.default)({
                    method: "get",
                    url: `${this._baseURL}/${index_2.services.nfts}/collections`,
                    params: {
                        collection_ids: encoded,
                    },
                });
                return colls.data;
            }
            catch (e) {
                throw e;
            }
        });
    }
    countNFTCopies(nft_id) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield this.getNFT(nft_id);
                const count = yield (0, axios_1.default)({
                    method: "get",
                    url: `${this._baseURL}/${index_2.services.nfts}/count`,
                    params: {
                        md5_hash: (_a = data.sologenic_info) === null || _a === void 0 ? void 0 : _a.md5_hash,
                    },
                });
                return count.data;
            }
            catch (e) {
                throw e;
            }
        });
    }
    getAccountNFTS(account) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this._checkConnection();
                if (account)
                    return yield (0, index_1.getAllAccountNFTS)(this._xrplClient, account);
                const wallet = this._checkWalletConnection();
                return yield (0, index_1.getAllAccountNFTS)(this._xrplClient, wallet.classicAddress);
            }
            catch (e) {
                throw e;
            }
        });
    }
    _checkWalletConnection() {
        if (!this._wallet)
            throw errors_1.default.wallet_not_connected;
        return this._wallet;
    }
    _setAuthHeaders() {
        if (this._wallet)
            this._authHeaders = {
                authorization: this._generateAuthToken(),
                address: this._wallet.classicAddress,
            };
    }
    _generateAuthToken() {
        if (this._wallet) {
            console.info("Generating Authentication Token...");
            // Transaction to sign
            const tx = {
                Account: this._wallet.classicAddress,
                TransactionType: "AccountSet",
                Memos: [
                    {
                        Memo: {
                            MemoData: (0, index_1.toHex)(`sign_in___${(0, moment_1.default)().utc().format("YYYY-MM-DD HH:mm:ss.000")}`),
                        },
                    },
                ],
            };
            const { tx_blob } = this._wallet.sign(tx);
            // Return tx_blob
            return tx_blob;
        }
    }
    _signTransaction(tx, options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.info("Signing TX => ", tx);
                const wallet = this._wallet;
                // Instantiate a Wallet to sign with
                if (options === null || options === void 0 ? void 0 : options.autofill) {
                    yield this._checkConnection();
                    const account_info = yield this._xrplClient.request({
                        command: "account_info",
                        account: wallet.classicAddress,
                        ledger_index: "current",
                    });
                    const current_ledger_sequence = account_info.result
                        .ledger_current_index;
                    const current_account_sequence = account_info.result.account_data.Sequence;
                    tx.LastLedgerSequence = current_ledger_sequence + 15;
                    tx.Fee = (0, xrpl_1.xrpToDrops)(0.001);
                    tx.Sequence = current_account_sequence;
                }
                // Sign the Transaction and get tx_blob
                const { tx_blob } = wallet.sign(tx);
                return tx_blob;
            }
            catch (e) {
                throw e;
            }
        });
    }
    _submitSignedTxToLedger(tx_blob) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.info("Submitting Transaction to the Ledger...");
                yield this._checkConnection();
                const result = yield this._xrplClient.submitAndWait(tx_blob, {
                    wallet: this._wallet,
                });
                return result;
            }
            catch (e) {
                throw e;
            }
        });
    }
    _checkConnection(client = "xrpl") {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                switch (client) {
                    case "clio":
                        if (!this._clioClient.isConnected())
                            yield this._clioClient.connect();
                        break;
                    case "xrpl":
                        if (!this._xrplClient.isConnected())
                            yield this._xrplClient.connect();
                        break;
                    default:
                        throw "Need to pass a client type";
                }
            }
            catch (e) {
                throw e;
            }
        });
    }
}
exports.SologenicBaseModule = SologenicBaseModule;
