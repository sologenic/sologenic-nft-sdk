# Sologenic Minter

This library was created to automate up to an extent the minting of NFTs.

DUE TO THE REQUIREMENTS OF USING THE WALLET SECRET, IT IS NOT RECOMMENDED TO USE THIS LIBRARY CLIENT SIDE.

```
npm i sologenic-minter
```

## Contents

- [Usage](#usage)
- [Sologenic Categories](#sologenic-categories)
- [Methods](#methods)
  - [getApiURL](#getApiURL)
  - [getWalletAddress](#getWalletAddress)
  - [getBurnConfiguration](#getBurnConfiguration)
  - [generateNFTSlots](#generateNFTSlots)
  - [createCollection](#createCollection)
  - [updateCollection](#updateCollection)
  - [getAllCollections](#getAllCollections)
  - [getCollectionAddress](#getCollectionAddress)
  - [getCollectionData](#getCollectionData)
  - [getCollectionNFTSlots](#getCollectionNFTSlots)
  - [mint](#mint)

## Usage

```js
import SologenicMinter from "sologenic-minter";
import fs from "fs";

const minter = new SologenicMinter({
  apiUrl: SOLOGENIC_API_URL,
  xrpl_node: XRPL_NODE,
  wallet: {
    address: YOUR_WALLET_ADDRESS,
    seed: YOUR_WALLET_SECRET,
  },
});

// Example of how to submit the files
const collectionCoverBuffer = fs.readFileSync("PATH_TO_COLLECTION_COVER_FILE");
const collectionThumbnailBuffer = fs.readFileSync("PATH_TO_COLLECTION_THUMBNAIL_FILE");
const nftFileBuffer = fs.readFileSync("PATH_TO_NFT_FILE");
const nftThumbnailBuffer = fs.readFileSync("PATH_TO_NFT_THUMBNAIL_FILE");

// After initializing the Minter, we need to set the collection address in which we want to mint
// Use setCollectionAddress() if you know the collection you want to mint in
// minter.setCollectionAddress(YOUR_DESIRED_COLLECTION);

// or create a new collection with createCollection(). This method sets the recently created collection as the default to mint on, it can be overriden with setCollectionAddress().
await minter.createCollection({
  name: "Test Collection", // REQUIRED: The name of the collection
  description: "Collection description", // OPTIONAL: The description of the collection
  cover: collectionCoverBuffer, // Cover of the Collection, can be only JPG, JPEG, PNG or GIF, recommended to be a compressed version, as this is for display purposes, it's not stored on the ledger
  thumbnail: collectionThumbnailBuffer // Thumbnail of the Collection, can be only JPG, JPEG, PNG or GIF, recommended to be a compressed version, as this is for display purposes, it's not stored on the ledger
  transfer_fee: 10000, // OPTIONAL (Defaults to 0): Sets the Royalty percentage for all the NFTs within this collection. Can be overwritten per NFT. A number between 0 and 50000 i.e to get 10% royalty transfer_fee  must be 10000
});

// Once the collection is set. If you have available Slot (or burns) you can start minting.
const { mint_tx_hash, NFTokenID } = await minter.mint({
  file: nftFileBuffer, // Original data of the NFT can be any of the supported files Sologenic accepts
  thumbnail: nftThumbnailBuffer, // Thumbnail of the NFT, can be only JPG, JPEG, PNG or GIF, recommended to be a compressed version, as this is for display purposes, it's not stored on the ledger
  name: "Testing NFT 3", // REQUIRED: The name of the NFT
  category: "arts", // REQUIRED: Sets the category on the NFT for the Marketplace
  only_xrp: false, // REQUIRED (Defaults to false): Sets if the NFT can only be traded for XRP
  is_explicit: false, // REQUIRED (Default to false): Sets if the NFT contains Explicit content
  transfer_fee: 10000, // OPTIONAL (Defaults to 0): A number between 0 and 50000 i.e to get 10% royalty transfer_fee must be 10000. If set, it will override the Collection Transfer fee.
  description: "Testing NFT description", // OPTIONAL: Description of the NFT
  external_url: "https://sologenic.org", // OPTIONAL: URL for more information of the NFT
  attributes: [
    //OPTIONAL: Attributes of the NFT, what makes it unique
    {
      trait_type: "attribute",
      value: "attr",
    },
    {
      trait_type: "attribute 2",
      value: 1,
      max_value: 2,
    },
  ],
});
```

## Sologenic Categories

```js
import { categories } from "sologenic-minter";
```

## Methods

### `getApiURL`

Returns the current Sologenic API URL

```js
const url = minter.getApiURL();
```

### `getWalletAddress`

Returns the address of the wallet which was used to initialize the Sologenic Minter

```js
const address = minter.getWalletAddress();
// rBDu1BC6f1SKRvRxPiHZdeML5CRwByQTFG
```

### `getBurnConfiguration`

Returns the current burn configuration to get NFT Slots

```js
const config = await minter.getBurnConfiguration();
```

Response

| Property      |                                    Value |
| :------------ | ---------------------------------------: |
| burn_amount   |                                        3 |
| burn_currency | 534F4C4F00000000000000000000000000000000 |
| burn_issuer   |       rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz |

### `generateNFTSlots`

Generates NFT Slots by burning SOLO.
NOTE: This method requires the connected wallet to have a positive SOLO Balance

```js
const slots_generation = await generateNFTSlots(1);
```

_Params_

| Param  | Type | Required | Example |
| :----- | :--- | :------: | :-----: |
| amount | int  |  `true`  |    1    |

_Response_

| Property    |                 Description |                                                          Example |
| :---------- | --------------------------: | ---------------------------------------------------------------: |
| address     | Wallet address used to burn |                               rBDu1BC6f1SKRvRxPiHZdeML5CRwByQTFG |
| hash        |       Burn Transaction Hash | 1016EC6C70C9C2CD9D3C6B8A8439AA538409181DBE1E5D56698BDAE61AE03608 |
| burns_count |    Amount of Slots acquired |                                                                1 |

### `createCollection`

Creates a new collection or returns the current unfinished collection.
NOTE: If there is an unfinished collection, the data passed will override the current collection information.
NOTE: This method sets the recently created (or updated) collection as the default to mint NFTs on

```js
import fs from "fs";

// Example of how to submit the files
const collectionCoverBuffer = fs.readFileSync("PATH_TO_COLLECTION_COVER_FILE");
const collectionThumbnailBuffer = fs.readFileSync("PATH_TO_COLLECTION_THUMBNAIL_FILE");


const collectionData = {
  name: "New Collection",
  description: "New Collection Description"
  cover: collectionCoverBuffer,
  thumbnail: collectionThumbnailBuffer,
  transfer_fee: 10000 // 10%
};

const new_collection = await minter.createCollection(collectionData);
```

_Params_

This method takes an object with all the data for the Collection.

| Property     | Type   | Required | Description                                                                                    |                  Example                   |
| :----------- | :----- | :------: | :--------------------------------------------------------------------------------------------- | :----------------------------------------: |
| name         | string |  `true`  | The name for the collection.                                                                   |          "My Awesome Collection"           |
| description  | string | `false`  | The description for the collection.                                                            | "My Awesome Description for my Collection" |
| cover        | Buffer | `false`  | Buffer for the cover of the collection                                                         |       <Buffer 08 06 07 05 03 00 09>        |
| thumbnail    | Buffer | `false`  | Buffer for the thumbnail of the collection                                                     |       <Buffer 08 06 07 05 03 00 09>        |
| transfer_fee | int    | `false`  | Royalties for the NFTs within this collection. NOTE: This can be overriden when minting an NFT |                   10000                    |

_Response_

| Property      |                                                                                                  Description |                                                                                   Example |
| :------------ | -----------------------------------------------------------------------------------------------------------: | ----------------------------------------------------------------------------------------: |
| issuer        |                                                                                 Identifier of the collection |                                                        rN7DsVCsJ6vRQtNMD8yMLeKvovSXM5P3Dg |
| name          |                                                                                       Name of the collection |                                                                   "My Awesome collection" |
| description   |                                                                                Description of the collection |                                                "My Awesome Description for my collection" |
| nfts          | List of NFT Slots, any slot can be empty (available) or filled (an nft has been uploaded but not minted yet) |                                     See [`getCollectionNFTSlots`](#getcollectionnftslots) |
| cover         |                                                                                    URL of the uploaded cover |     https://storage.googleapis.com/sg-nft-images/cover/rN7DsVCsJ6vRQtNMD8yMLeKvovSXM5P3Dg |
| thumbnail     |                                                                                URL of the uploaded thumbnail | https://storage.googleapis.com/sg-nft-images/thumbnail/rN7DsVCsJ6vRQtNMD8yMLeKvovSXM5P3Dg |
| unusued_burns |                                                                            Amount of available slots to mint |                                                                                         5 |
| minted_nfts   |                                                              List of ALL minted NFTs within this collections |                                                                                     NFT[] |

### `updateCollection`

Updates the current set collection.

```js
import fs from "fs";

// Example of how to submit the files
const collectionCoverBuffer = fs.readFileSync("PATH_TO_COLLECTION_COVER_FILE");
const collectionThumbnailBuffer = fs.readFileSync("PATH_TO_COLLECTION_THUMBNAIL_FILE");


const collectionData = {
  name: "New Updated Collection",
  description: "New Collection Description Update"
  cover: collectionCoverBuffer,
  thumbnail: collectionThumbnailBuffer,
  transfer_fee: 10000 // 10%
};

// Set the default collection
await minter.setCollectionAddress("rN7DsVCsJ6vRQtNMD8yMLeKvovSXM5P3Dg");

// Update default collection
await minter.updateCollection(collectionData);

// Get updated default collection
const collection = await minter.getCollectionData();

```

_Params_

This method takes an object with all the data for the Collection.
NOTE: Only unfinished collections can be updated.

| Property     | Type   | Required | Description                                                                                    |                  Example                   |
| :----------- | :----- | :------: | :--------------------------------------------------------------------------------------------- | :----------------------------------------: |
| name         | string |  `true`  | The name for the collection.                                                                   |          "My Awesome Collection"           |
| description  | string | `false`  | The description for the collection.                                                            | "My Awesome Description for my Collection" |
| cover        | Buffer | `false`  | Buffer for the cover of the collection                                                         |       <Buffer 08 06 07 05 03 00 09>        |
| thumbnail    | Buffer | `false`  | Buffer for the thumbnail of the collection                                                     |       <Buffer 08 06 07 05 03 00 09>        |
| transfer_fee | int    | `false`  | Royalties for the NFTs within this collection. NOTE: This can be overriden when minting an NFT |                   10000                    |

_Response_

This method doesn't return a response. After calling this method, you need to call `await minter.getCollectionData()` to see the updated collection data.

### `getAllCollections`

This method returns an Array of all the collections available to the account.

```js
const collections = await minter.getAllCollections();
```

_Response_

An array of Collection Objects. These are the properties of the Collection object. Please see [`getCollectionData`](#getcollectiondata) to see properties of the Collection object

### `getCollectionAddress`

This method returns the address of the default collection

```js
const collection_address = await minter.getCollectionAddress();
// rN7DsVCsJ6vRQtNMD8yMLeKvovSXM5P3Dg
```

### `getCollectionData`

This method returns the data of the default collection

_Response_

| Property     | Description                                                                                      |                                                                                     Example |
| :----------- | :----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------: |
| name         | Name of the collection                                                                           |                                                                     "My Awesome Collection" |
| description  | Description of the collection                                                                    |                            1016EC6C70C9C2CD9D3C6B8A8439AA538409181DBE1E5D56698BDAE61AE03608 |
| cover        | URL of the cover uploaded                                                                        |     "https://storage.googleapis.com/sg-nft-images/cover/rN7DsVCsJ6vRQtNMD8yMLeKvovSXM5P3Dg" |
| thumbnail    | URL of the thumbnail uploaded                                                                    | "https://storage.googleapis.com/sg-nft-images/thumbnail/rN7DsVCsJ6vRQtNMD8yMLeKvovSXM5P3Dg" |
| transfer_fee | Royalty set for all the NFTs within this collection. NOTE: Can be overriden when minting an NFT. |                                                                                       10000 |
| cid          | Collection ID on IPFS                                                                            |                                 bafybeiba6su6ni3dfwhmjbzi5fz4pqehtnnwgg5yjwhss6mak3wqnwglhm |
| created_at   | Date of creation                                                                                 |                                                                    2022-12-30T17:23:26.000Z |
| minted_nfts  | Amount of NFTs minted in this collection                                                         |                                                                                           5 |

### `getCollectionNFTSlots`

This method returns an Array of all the NFT Slots of the default collection, both available and already uploaded, but not minted, NFTs.

_Response_

These are the properties of each NFT Slot.

| Property     |                                                                                                                                                  Description |                                                                                         Example |
| :----------- | -----------------------------------------------------------------------------------------------------------------------------------------------------------: | ----------------------------------------------------------------------------------------------: |
| id           |                                                                                                                                               ID of the slot |                                                                                           12345 |
| uid          |                                                                                                                                              UID of the slot |                                                            829df87d-0e2e-48f6-8387-b6a2e1a26462 |
| currency     |                                                                                                                                        Legacy ID for the NFT |                                                        023031516D656A664E4654393331363900000000 |
| name         |                                                                                                                                              Name of the NFT |                                                                                  My Awesome NFT |
| location     |                                                                                                                                           IPFS ID of the NFT |                                     bafybeihtuck5qncoo2img32zvyjm54r6t6are2xelbrrtqhp7lb73zlulq |
| content_type |                                                                                                                           Type and extension of the NFT file |                                                                                       image/png |
| thumbnail    |                                                                                                                                URL of the uploaded thumbnail | https://storage.googleapis.com/sg-nft-images/thumbnail/rDZj8PN21gmtWwqFY1SAqyubRHeT87NSVC/35449 |
| md5_hash     |                                                                                                                                     md5_hash of the NFT file |                                                                96cc419020a6f55a6c05e38968ec5bb4 |
| transfer_fee | Royalty for this NFT, if 0 and Collection Royalty is set, Collection royalty will be added to the NFT. If this is set, Collection Royalty will be overriden. |                                                                                           10000 |
| only_xrp     |                                                                                                                This sets if the NFT can only be sold for XRP |                                                                    0 or 1 (0 = false, 1 = true) |
| sealed       |                                                                                                                    Indicates if NFT has been set for minting |                                                                    0 or 1 (0 = false, 1 = true) |

### `mint`

This method mints and NFT within the default collection if there are any NFT Slots available.

```js
import fs from "fs";

const nftFileBuffer = fs.readFileSync("PATH_TO_NFT_FILE");
const nftThumbnailBuffer = fs.readFileSync("PATH_TO_NFT_THUMBNAIL_FILE");

const nft = {
  file: nftFileBuffer,
  thumbnail: nftThumbnailBuffer,
  name: "Testing NFT 3",
  category: "art",
  only_xrp: false,
  is_explicit: false,
  transfer_fee: 10000,
  description: "Testing NFT description",
  external_url: "https://sologenic.org",
  attributes: [
    {
      trait_type: "attribute",
      value: "attr",
    },
    {
      trait_type: "attribute 2",
      value: 1,
      max_value: 2,
    },
  ],
};

const { NFTokenID, mint_tx_hash } = await minter.mint(nft);
```

_Params_

This method takes an Object with all the data of the NFT. These are the properties.

| Property     | Type    | Required |
| :----------- | :------ | :------: |
| file         | Buffer  |  `true`  |
| thumbnail    | Buffer  |  `true`  |
| name         | string  |  `true`  |
| category     | string  |  `true`  |
| only_xrp     | boolean |  `true`  |
| is_explicit  | boolean |  `true`  |
| transfer_fee | int     | `false`  |
| description  | string  | `false`  |
| external_url | URL     | `false`  |

_Response_

This method returns an object, these are the properties of the object

| Property     |                                                          Example |
| :----------- | ---------------------------------------------------------------: |
| mint_tx_hash | B1561A148081359BECA7D4F309820B88DB9940A58458D5D363B8BED02EDB9D3A |
| NFTokenID    | 000827107022610A05BAA45AE04D5B022D1FF298795EF9ABE4FAB9DF0000000A |
