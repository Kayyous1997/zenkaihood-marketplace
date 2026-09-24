export const collectionTokenViewsAbi = [
  {
    type: "function",
    name: "getCollectionTokenCapabilities",
    inputs: [{ name: "nftContract", type: "address" }],
    outputs: [{ name: "capabilities", type: "tuple", components: [
      { name: "registered", type: "bool" },
      { name: "tokenStandard", type: "uint8" },
      { name: "supportsErc721Enumerable", type: "bool" },
      { name: "supportsErc721TotalSupply", type: "bool" },
      { name: "supportsErc1155TotalSupply", type: "bool" },
    ] }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRegisteredCollectionTokenIds",
    inputs: [
      { name: "nftContract", type: "address" },
      { name: "offset", type: "uint256" },
      { name: "limit", type: "uint256" },
    ],
    outputs: [{ name: "tokenIds", type: "uint256[]" }],
    stateMutability: "view",
  },
] as const;
