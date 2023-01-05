export default {
  wallet_not_connected: {
    error: "SG_ERROR: ACC_NOT_CONNECT",
    message:
      "Account has not been set. Use setAccount() method to set an XRPL Account.",
  },
  property_missing: {
    error: "SG_ERROR: PROP_MISSING",
    message: "Property missing from constructor: ",
  },
  collection_not_set: {
    error: "SG_ERROR: COL_NOT_SET",
    message:
      "Collection has not been set. Use setCollectionAddress() method to set a Sologenic Collection.",
  },
  nft_slots_not_available: {
    error: "SG_ERROR: NFT_SLOTS_UNAVAIL",
    message:
      "No NFT slots available. Use generateNFTSlots() method to generate more NFT Slots.",
  },
  unknown: {
    error: "UNKNWN_ERROR",
    message: "Unknown error",
  },
  nft_not_found: {
    error: "SG_ERROR: NFT_NOT_FOUND",
    message:
      "NFT data not found. NFT might not exists or was not minted on the Sologenic NFT Marketplace or this XRPL Node.",
  },
  collection_already_sealed: {
    error: "SG_ERROR: COL_FINALIZED",
    message: "This collection has been finalized and cannot be updated.",
  },
};
