# Sologenic NFT Trader

This library is to simplify the process of trading NFTS.

DUE TO THE REQUIREMENTS OF USING THE WALLET SECRET, DO NOT USE THIS LIBRARY AT THE CLIENT SIDE !!!!!!!!!!

## Contents

- [Usage](#usage)
- [Methods](#methods)
  - [getNFTOffers](#getnftoffers)
  - [acceptOffer](#acceptoffer)
  - [brokerNFTOffers](#brokernftoffers)
  - [setNFTForSale](#setnftforsale)
  - [placeBidOnNFT](#placebidonnft)
  - [cancelNFTOffers](#cancelnftoffers)
  - [getCollectionTradingData](#getcollectiontradingdata)
  - [getNFTTrades](#getnfttrades)

## Usage

The trader is an atomically instanceable class that can be initialised using only a `Mode` (either `devnet` | `testnet` | `mainnet`), and a url to the XRPL node you wish to connect to. Here, the `Mode` is used internally by us to determine which of Sologenic's internal endpoints to use, since they are `network-specific`. Thus, please ensure that the `Mode` provided matches the xrpl node you wish to connect to. If you accidentally provide a mainnet node url with `Mode` set to mainnet, you will likely encounter problems.

For example, this is how an instance of the trader can be created for interacting with
the mainnet XRPL.

```ts
const trader = new SologenicNFTTrader({
  mode: "mainnet",
  xrpl_node: "wss://xrpl.ws",
});
```

Since each instance of the `SologenicNFTTrader` is atomic, you can create as many as you want, connected either the same network, or to disparate networks.

```ts
const trader = new SologenicNFTTrader({
  mode: "mainnet",
  xrpl_node: "wss://xrpl.ws",
});
const trader_2 = new SologenicNFTTrader({
  mode: "mainnet",
  xrpl_node: "wss://xrpl.ws",
});

const testnet_trader = new SologenicNFTTrader({
  mode: "testnet",
  xrpl_node: "...",
});
const devnet_trader = new SologenicNFTTrader({
  mode: "devnet",
  xrpl_node: "...",
});
```

## Methods

### `getNFTOffers`

An async function that returns the buy offers and sell offers for an nft, encapsulated into a single object. This object has two properties,
`buy_offers`, and `sell_offers`, which are arrays of the offers in the respective direction (`buy` or `sell`).

_Params_

| Param   | Type   |
| :------ | :----- |
| address | string |

_Returns_

| Param       | Type                                                                                                               |
| :---------- | :----------------------------------------------------------------------------------------------------------------- |
| buy_offers  | [NFTOffer](https://github.com/XRPLF/xrpl.js/blob/8921b6ac/packages/xrpl/src/models/methods/nftSellOffers.ts#L25)[] |
| sell_offers | [NFTOffer](https://github.com/XRPLF/xrpl.js/blob/8921b6ac/packages/xrpl/src/models/methods/nftSellOffers.ts#L25)[] |

_Example_

```ts
const nft_id = "000013AB...";
const offers = await trader.getNFTOffers(nft_id);
const { buy_offers, sell_offers } = offers;
```

### `acceptOffer`

An async function that accepts an NFT offer. This function takes two inputs, the `offer`, and an `options` object. The offer can either be passed in directly as the offer object from the ledger, or as the `nft_offer_index` itself. The options object contains only one property `isBuy`, which is a boolean that determines whether the `nft_offer_index` should be treated as a `buy_offer` or `sell_offer`.

_Params_

| Param         | Type                                                                                                                       |
| :------------ | :------------------------------------------------------------------------------------------------------------------------- |
| offer         | string \| [NFTOffer](https://github.com/XRPLF/xrpl.js/blob/8921b6ac/packages/xrpl/src/models/methods/nftSellOffers.ts#L25) |
| options       | Object                                                                                                                     |
| options.isBuy | boolean                                                                                                                    |

_Returns_

| Param    | Type       |
| :------- | :--------- |
| response | TxResponse |

_Example_

```ts
// with the nft_offer_index
const nft_offer_index = "000013AB...";
const result = await trader.acceptOffer(nft_id, { isBuy: true });

// with the offer object, assuming there is one
const nft_id = "000013AB...";
const { buy_offers } = await trader.getNFTOffers(nft_id);
const offer = buy_offers[0];
const result = await trader.acceptOffer(offer, { isBuy: true });
```

### `brokerNFTOffers`

An async function that enables users to make `brokered` offers. This function takes only one input as an object containing all the required fields to process a brokered transaction. The only caveat is that if you provide `max_broker_fee` as true, you need not provide an explicit `broker_fee`. Simialrly, if you desire to use a flat broker fee, do not pass `max_broker_fee`, but only pass `broker_fee`.

_Params_

| Param                         | Type                                                                                                             |
| :---------------------------- | :--------------------------------------------------------------------------------------------------------------- |
| BrokerModeArgs                | Object                                                                                                           |
| BrokerModeArgs.nft_id         | string                                                                                                           |
| BrokerModeArgs.sell_offer     | [NFTOffer](https://github.com/XRPLF/xrpl.js/blob/8921b6ac/packages/xrpl/src/models/methods/nftSellOffers.ts#L25) |
| BrokerModeArgs.buy_offer      | [NFTOffer](https://github.com/XRPLF/xrpl.js/blob/8921b6ac/packages/xrpl/src/models/methods/nftSellOffers.ts#L25) |
| BrokerModeArgs.max_broker_fee | boolean \| undefined                                                                                             |
| BrokerModeArgs.broker_fee     | Amount \| undefined                                                                                              |

_Returns_

| Param    | Type       |
| :------- | :--------- |
| response | TxResponse |

_Example_

```ts
interface BrokeredModeArgs {
  nft_id: string;
  sell_offer: NFTOffer;
  buy_offer: NFTOffer;
  max_broker_fee?: boolean;
  broker_fee?: Amount;
}

const args: BrokeredModeArgs = {
  nft_id: "000013AB...",
  sell_offer: {...},
  buy_offer: {...},
  max_broker_fee: true
}

const result = await trader.brokerNFTOffers(args);
```

### `setNFTForSale`

An async function that lists an NFT for sale. It takes the nft_id, as well as an options object that can be used to specify the amount that the NFT is put on sale, an expiration date, or a destination address.

_Params_

| Param                      | Type                                                                                                           |
| :------------------------- | :------------------------------------------------------------------------------------------------------------- |
| nft_id                     | string                                                                                                         |
| NFTSaleOptions             | Object                                                                                                         |
| NFTSaleOptions.amount      | [Amount](https://github.com/XRPLF/xrpl.js/blob/8921b6ac/packages/xrpl/src/models/transactions/payment.ts#L114) |
| NFTSaleOptions.expiration  | Date \| number \| string                                                                                       |
| NFTSaleOptions.destination | string                                                                                                         |

_Returns_

| Param    | Type       |
| :------- | :--------- |
| response | TxResponse |

_Example_

```ts
interface NFTSaleOptions {
  amount: Amount;
  expiration?: number | Date | string;
  destination?: string;
}

const args: NFTSaleOptions = {
  amount: "100000",
};

const nft_id = "000013AB...";
const result = await trader.setNFTForSale(nft_id, args);
```

### `placeBidOnNFT`

An async function that creates a buy offer for an NFT, thereby creating a bid that can be accepted by the owner of the NFT.

_Params_

| Param          | Type                     |
| :------------- | :----------------------- |
| nft_id         | string                   |
| Bid            | Object                   |
| Bid.amount     | string \| ParsedAmount   |
| Bid.expiration | Date \| number \| string |

_Returns_

| Param    | Type       |
| :------- | :--------- |
| response | TxResponse |

_Example_

```ts
interface Bid {
  amount: string | ParsedAmount;
  expiration?: number | Date | string;
}

const args: Bid = {
  amount: "100000",
};

const nft_id = "000013AB...";
const result = await trader.setNFTForSale(nft_id, args);
```

### `cancelNFTOffers`

An async functon that allows a user to cancel one or more offers, regardless of whether they are buy offers or sell offers. Even if only one offer is being cancelled, it still must be included in an array.

_Params_

| Param   | Type     |
| :------ | :------- |
| nft_ids | string[] |

_Returns_

| Param    | Type       |
| :------- | :--------- |
| response | TxResponse |

_Example_

```ts
const offers = ["000013AB..."];
const result = await trader.cancelNFTOffers(offers);
```

### `getCollectionTradingData`

An async functon that retrieves the collection trading data for an NFT collection stored on the Sologenic Databse. Trading stats include the `floor price`, the `nft count`, as well as the `traded volume`.

_Params_

| Param   | Type   |
| :------ | :----- |
| address | string |

_Returns_

| Param    | Type                  |
| :------- | :-------------------- |
| response | CollectionTradingData |

_Example_

```ts
const address = "rXY14...";
const result = await trader.getCollectionTradingData(address);
```

### `getNFTTrades`

An async functon that retrieves the trading history for an NFT stored on the Sologenic Databse. This data is provided as an array of actions, which are tied to events like `minted`, `bought`, `sold`, and so on. The function also takes an options object, allowing to further filter the actions that are returned.

_Params_

| Param         | Type                         |
| :------------ | :--------------------------- |
| address       | areinfå                      |
| options       | Object \| undefined          |
| options.limit | number \| undefined          |
| options.types | NFTActionType[] \| undefined |

_Returns_

| Param    | Type      |
| :------- | :-------- |
| response | NFTAction |

_Example_

```ts
interface NFTActionsOptions {
  before_id?: number | string;
  limit?: number;
  types?: NFTActionType[];
}

const address = "r1234...";
const options: NFTActionsOptions = {};

const result = await trader.getNFTTrades(address, options);
```
