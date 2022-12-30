# Sologenic Minter

This library was created to automate up to an extent the minting of NFTs.

DUE TO THE REQUIREMENTS OF USING THE WALLET SECRET, IT IS NOT RECOMMENDED TO USE THIS LIBRARY CLIENT SIDE.

### Requirements

Collection Address - You can get this after creating a collection on the Sologenic UI Platform and retrieving the address.

```
npm i sologenic-minter
```

### Usage

```javascript
import SologenicMinter from "sologenic-minter";

const minter = new SologenicMinter({
  apiUrl: SOLOGENIC_API_URL,
  xrpl_node: XRPL_NODE,
  wallet: {
    address: YOUR_WALLET_ADDRESS,
    seed: YOUR_WALLET_SECRET,
  },
});

// After initializing the Minter, we need to set the collection address in which we want to mint
minter.setCollectionAddress(YOUR_DESIRED_COLLECTION);

// Once the collection is set. If you have available Slot (or burns) you can start minting.
const { mint_tx_hash, NFTokenID } = await minter.mint({
  file: file, // Original data of the NFT can be any of the supported files Sologenic accepts
  thumbnail: file, // Thumbnail of the NFT, can be only JPG, JPEG, PNG or GIF
  name: "Testing NFT 3", // REQUIRED: The name of the NFT
  category: "arts", // REQUIRED: Sets the category on the NFT for the Marketplace
  only_xrp: false, // REQUIRED (Defaults to false): Sets if the NFT can only be traded for XRP
  is_explicit: false, // REQUIRED (Default to false): Sets if the NFT contains Explicit content
  transfer_fee: 10000, // OPTIONAL (Defaults to 0): A number between 0 and 50000 i.e to get 10% royalty transfer_fee must be 10000
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
