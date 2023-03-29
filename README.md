# Sologenic NFT SDK

DUE TO THE REQUIREMENTS OF USING THE WALLET SECRET, DO NOT USE THIS LIBRARY AT THE CLIENT SIDE !!!!!!!!!!

```
npm i sologenic-nft-sdk
```

## Contents

- [SologenicNFTManager](./docs/MANAGER.md)
- [SologenicNFTTrader](./docs/TRADER.md)

## Usage

```js
import { SologenicNFTManager, SologenicNFTTrader } from "sologenic-nft-sdk";
```

Both classes share the following methods:

## Methods

- [getApiURL](#getApiURL)
- [setAccount](#setAccount)
- [getAccountNFTS](#getAccountNfts)
- [getWalletAddress](#getWalletAddress)
- [getNFT](#getNFT)
- [getMultipleNFTS](#getMultipleNFTS)
- [getCollection](#getCollection)
- [getMultipleCollections](#getMultipleCollections)
- [countNFTCopies](#countNFTCopies)

### `getApiURL`

Returns information about the Sologenic API mode connection

```js
const url = CLASS.getApiURL();
```

_Returns_

This method returns an object with the following properties:

| Property |                        Value |
| :------- | ---------------------------: |
| mode     | mainnet or testnet or devnet |
| url      |            Sologenic Api URL |

### `setAccount`

This method sets the default account to use.

_Example_

```js
const wallet_address = CLASS.setAccount(YOUR_WALLET_SECRET);
// rBDu1BC6f1SKRvRxPiHZdeML5CRwByQTFG
```

### `getAccountNFTS`

This method returns ALL the NFTs owned by this account in reference to the ledger; to get the NFT metadata (name, description, etc) you will need to call the method [getNFT](#getNFT).

_Example_

```js
const nfts = await CLASS.getAccountNFTS();
```

_Params_

This method takes one OPTIONAL parameter; an account address. If they account address is not passed, it will default to the connected account. If there is no parameter passed nor account connected (See [setAccount](#setAccount)), this method will throw an exception.

| Param   |   Type |
| :------ | -----: |
| address | string |

_Returns_
This method returns an array of the NFTs owned by the passed account (or default account) on reference with the XRP Ledger. These are the properties on each NFT object

| Property       | Description                                                                                                                                                                                                                                                                                                   |                                                                                                                                                                                      Example |
| :------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
| TransferFee    | The royalty set for this NFT. 10000 = 10%                                                                                                                                                                                                                                                                     |                                                                                                                                                                                        10000 |
| Flags          | Flags are properties or other options associated with the NFT object.                                                                                                                                                                                                                                         |                                                                                                                                                                                            8 |
| NFTokenTaxon   | The taxon associated with the token.                                                                                                                                                                                                                                                                          |                                                                                                                                                                                        34356 |
| NFTokenID      | Unique identifier of the NFT on the XRPL Ledger                                                                                                                                                                                                                                                               |                                                                                                                             000A2134C4E16036D649C037D2DE7C58780DE1D985EEB986483AE3C9000001AC |
| nft_serial     | Serial number of the NFT                                                                                                                                                                                                                                                                                      |                                                                                                                                                                                            8 |
| Issuer         | Minter of the NFT.                                                                                                                                                                                                                                                                                            |                                                                                                                                                           rBDu1BC6f1SKRvRxPiHZdeML5CRwByQTFG |
| URI (Optional) | Up to 256 bytes of arbitrary data. You can use the xrpl.convertHexToString utility to convert the HEX string to its string equivalent. The contents could decode to an HTTP or HTTPS URL, an IPFS URI, a magnet link, immediate data encoded as an RFC 2379 "data" URL , or even an issuer-specific encoding. | 68747470733A2F2F697066732E696F2F697066732F62616679626569666F76696766743578636B6A696C6C6A666E636F756F74716A626E7669697070326F636A35323471347675747161736D6B7378612F6D657461646174612E6A736F6E |

### `getWalletAddress`

Returns the address of the wallet which was used to initialize the Sologenic Minter

_Example_

```js
const address = CLASS.getWalletAddress();
// rBDu1BC6f1SKRvRxPiHZdeML5CRwByQTFG
```

### `getNFT`

This method returns the data of an specific NFT using its NFTokenID.
Note: If the NFT exists on the XRP Ledger but this method returns a NFT_NOT_FOUND, maybe the NFT was not minted on the Sologenic NFT Marketplace.

_Example_

```js
const nft_data = await CLASS.getNFT(NFTokenID);
```

_Params_

This method takes one parameter.

| Property  |   Type | Description                                                      |
| :-------- | -----: | :--------------------------------------------------------------- |
| NFTokenID | string | 000A2134C4E16036D649C037D2DE7C58780DE1D985EEB986483AE3C9000001AC |

_Returns_

This method returns an object with 2 objects inside. `sologenic_info` and `xrpl_info`. If the NFT exists, `xrpl_info` should always be returned, if `sologenic_info` is `NULL` then it means the NFT was not minted on the sologenic platform.

#### `xrpl_info`

| Property     |                                                                                           Description | Example                                                                                        |
| :----------- | ----------------------------------------------------------------------------------------------------: | :--------------------------------------------------------------------------------------------- |
| nft_id       |                                                                                             NFTokenID | 000827107022610A05BAA45AE04D5B022D1FF298795EF9AB000083F100000000                               |
| ledger_index |                                                               Current Ledger index of the XRPL Server | 76545315                                                                                       |
| is_burned    |                                                                Whether the NFT has been burned or not | `false`                                                                                        |
| issuer       |                                                                                       Issuing address | rBDu1BC6f1SKRvRxPiHZdeML5CRwByQTFG                                                             |
| owner        |                                                                                 Current owner address | rBDu1BC6f1SKRvRxPiHZdeML5CRwByQTFG                                                             |
| flags        |                                                              Flags of the settings enabled in the NFT | 8                                                                                              |
| transfer_fee |                                        Royalty percentage the issuer gets after every sale of the NFT | 10000 (10%)                                                                                    |
| nft_taxon    |                                                  Taxon for the NFT set on the NFTokenMint transaction | 12345                                                                                          |
| nft_sequence |                                            Serial number of the NFT. Referenced to the Issuer account | 12                                                                                             |
| uri          |                                   Arbitrary data set on the URI field of the NFTokenMint transaction. | https://ipfs.io/ipfs/bafybeie7cd4s2pv4e5tode7xjvqjlkpp5kuflqcl73keadixevqjoq3r3y/metadata.json |
| validated    | States that the ledger index when this request was made has been validated on the XRP Ledger servers. | true                                                                                           |

#### `sologenic_info`

| Property               |                                                          Description | Example                                                                               |
| :--------------------- | -------------------------------------------------------------------: | :------------------------------------------------------------------------------------ |
| id                     |                                                            NFTokenID | 000827107022610A05BAA45AE04D5B022D1FF298795EF9AB000083F100000000                      |
| standard               |                                               NFT Standard minted on | XLS-20d                                                                               |
| collection_id          |                                                   Collection address | rDZj8PN21gmtWwqFY1SAqyubRHeT87NSVC                                                    |
| minter                 |                                                       Minter address | rBDu1BC6f1SKRvRxPiHZdeML5CRwByQTFG                                                    |
| owner                  |                                                Current owner address | rBDu1BC6f1SKRvRxPiHZdeML5CRwByQTFG                                                    |
| ipfs_cid               |                                               CID of the NFT on IPFS | bafybeihly7rjgfypze7hcruuss3vgzl7wh2e7zcplsbsj75ecrnuwjlydi                           |
| md5_hash               |                                  MD5 hash of the contents of the NFT | cfe2892441f41d6ea15f1e4e71614f3f                                                      |
| minted_txid            | Transaction Hash of the NFTokenMint Transaction that minted this NFT | 590B998100CCA720D0BA77BC73EF69E6358A53AE9A86A8E706DAC8498DBA0738                      |
| metadata.animation_url |                                        IPFS Url of the NFT Animation | ipfs://ipfs/bafybeiacwbv46qb7mnnjppxpshenoo5dc65uvucz3nggfimriz2hoqtsiq/animation.png |
| metadata.attributes    |                               Array of attributes pertaining the NFT | See [mint()](#mint) for details of this property                                      |
| metadata.category      |                                                  Category of the NFT | art                                                                                   |
| metadata.content_type  |                                                 Mime type of the NFT | image/png                                                                             |
| metadata.description   |                                               Description of the NFT | Testing NFT Description                                                               |
| metadata.external_url  |                                       External URL minted on the NFT | https://sologenic.org                                                                 |
| metadata.image_url     |                                            IPFS URL of the NFT Image | ipfs://ipfs/bafybeiacwbv46qb7mnnjppxpshenoo5dc65uvucz3nggfimriz2hoqtsiq/image.png     |
| metadata.is_explicit   |               Whether the NFT includes explicit or sensitive content | `false`                                                                               |
| metadata.md5hash       |                                  MD5 hash of the contents of the NFT | cfe2892441f41d6ea15f1e4e71614f3f                                                      |
| metadata.name          |                                                      Name of the NFT | Testing NFT                                                                           |

### `getMultipleNFTS`

This method returns an array of NFTs. To see the content of this NFTs, refer to (`getNFT`)[#getNFT].

_Example_

```js
const nft_ids = [
  "000A2134C4E16036D649C037D2DE7C58780DE1D985EEB986483AE3C9000001AC",
  "000A2134C4E16036D649C037D2DE7C58780DE1D985EEB986483AE3C9000001AC",
];

const nfts = await CLASS.getMultipleNFTS(nft_ids);
```

_Params_

This method takes one parameter.

| Property |     Type | Description                  |
| :------- | -------: | :--------------------------- |
| nft_ids  | string[] | Array of NFT IDs to retrieve |

_Returns_

This method returns an array of objects with 2 properties inside. `sologenic_info` and `xrpl_info`. If the NFT exists, `xrpl_info` should always be returned, if `sologenic_info` is `NULL` then it means the NFT was not minted on the sologenic platform. Refer to `getNFT` method to learn more about the return.

### `getCollection`

This method returns the information of a collection within the Sologenic NFT Marketplace.

_Example_

```js
const collection = await CLASS.getCollection(
  "rN7DsVCsJ6vRQtNMD8yMLeKvovSXM5P3Dg"
);
```

_Params_

This method takes one parameter.

| Property      |   Type | Description                      |
| :------------ | -----: | :------------------------------- |
| collection_id | string | ID of the collection to retrieve |

_Returns_

This method returns the publicy available information of the specified collection.

| Property                 |   Type | Description                                                 |
| :----------------------- | -----: | :---------------------------------------------------------- |
| created_at               | string | Creation date                                               |
| updated_at               | string | Update date                                                 |
| id                       | string | ID of the collection                                        |
| ipfs_cid                 | string | ID of the IPFS location                                     |
| issuer                   | string | XRPL Address issuing the NFTs (Legacy XLS14)                |
| minter                   | string | ADdress of the minter account                               |
| metadata                 | Object | Metadata of the collection                                  |
| metadata.address         | string | Same as issuer or ID                                        |
| metadata.collection_name | string | Name of the collection                                      |
| metadata.collection_uid  | string | UID of the collection                                       |
| metadata.created_at      | string | Creation date                                               |
| metadata.description     | string | Description of the collection                               |
| metadata.minted_by       | string | Minter address                                              |
| metadata.minter          | string | Minting website                                             |
| stats                    | Object | Trading data for the collection                             |
| stats.floor_price        | string | Lowest price of any NFT on sale within that collection      |
| stats.nft_count          | string | Number of NFTs inside the collection                        |
| stats.owner_count        | string | Number of unique NFT owners holding NFTs of this collection |
| stats.volume             | Object | Trading volume                                              |

### `getMultipleCollections`

This method returns an array of Collections. To see the content of this Collection, refer to (`getCollection`)[#getCollection].

_Example_

```js
const collection_ids = [
  "rN7DsVCsJ6vRQtNMD8yMLeKvovSXM5P3Dg",
  "rN7DsVCsJ6vRQtNMD8yMLeKvovSXM5P3Dg",
  "rN7DsVCsJ6vRQtNMD8yMLeKvovSXM5P3Dg",
];

const collections = await CLASS.getMultipleCollections(collection_ids);
```

_Params_

This method takes one parameter.

| Property       |     Type | Description                                      |
| :------------- | -------: | :----------------------------------------------- |
| collection_ids | string[] | IDs of the collections to retrieve (Limit of 20) |

### `countNFTCopies`

This method returns the amount of NFTs with the same `md5_hash`, meaning there are more NFTs with the same data.

```js
const count = await CLASS.countNFTCopies(nft_id);
```

_Params_

This method takes one parameter.

| Property |   Type | Description                       |
| :------- | -----: | :-------------------------------- |
| nft_id   | string | ID of the NFT to check for copies |

_Returns_

This method returns a number

| Property         |   Type | Description                            |
| :--------------- | -----: | :------------------------------------- |
| amount of copies | number | Number of NFTs with the same data file |
