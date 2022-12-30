import file from "./file";

export default {
  file,
  thumbnail: file,
  name: "Testing NFT 3",
  category: "arts",
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
