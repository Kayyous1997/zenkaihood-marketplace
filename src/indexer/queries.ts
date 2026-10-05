/**
 * All GraphQL queries for the Zenkaihood subgraph.
 *
 * Schema reference: Contracts/Marketplace-Contract/subgraph/schema.graphql
 *
 * Entity types:
 *   MarketplaceConfig, PaymentToken, Collection, Token, ERC1155Balance,
 *   Listing, Offer, Auction, Bid, Sale, Activity
 */

// ─────────────────────────────────────────────────────────────────────────────
// Marketplace Config
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch live platform config: fee bps, fee recipient, pause state.
 * Used on: Home page fee display, listing/buy dialogs, footer.
 */
export const GET_MARKETPLACE_CONFIG = `
  query GetMarketplaceConfig {
    marketplaceConfigs(first: 1) {
      id
      marketplace
      registry
      platformFeeBps
      feeRecipient
      paused
      registryPaused
    }
  }
`;

export interface MarketplaceConfigResult {
  marketplaceConfigs?: Array<{
    id: string;
    marketplace: string;
    registry: string;
    platformFeeBps: number | string;
    feeRecipient: string;
    paused: boolean;
    registryPaused: boolean;
  }>;
  marketplaceConfig?: {
    id?: string;
    marketplace: string;
    registry: string;
    platformFeeBps: number | string;
    feeRecipient: string;
    paused: boolean;
    registryPaused: boolean;
  } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Payment Tokens
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all currently supported ERC-20 payment tokens.
 * id is the token contract address (address(0) = ETH is handled natively).
 * Used on: listing/buy/offer/auction payment token selector.
 */
export const GET_PAYMENT_TOKENS = `
  query GetPaymentTokens {
    paymentTokens(where: { supported: true }) {
      id
      supported
      updatedAtBlock
    }
  }
`;

export interface PaymentTokensResult {
  paymentTokens: Array<{
    id: string;
    supported: boolean;
    updatedAtBlock: string;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Collections
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Paginated list of all active registered collections.
 * Used on: /explore, Home trending section.
 *
 * Variables:
 *   first         — page size (max 100)
 *   skip          — offset for pagination
 *   onlyVerified  — pass true to filter verified-only (optional, null = all)
 */
export const GET_COLLECTIONS = `
  query GetCollections($first: Int!, $skip: Int!) {
    collections(
      first: $first
      skip: $skip
      orderBy: registeredAt
      orderDirection: desc
      where: { active: true }
    ) {
      id
      creator
      tokenStandard
      metadataURI
      royaltyRecipient
      royaltyBps
      verified
      active
      listingCount
      activeListingCount
      offerCount
      activeOfferCount
      auctionCount
      activeAuctionCount
      registeredAt
    }
  }
`;

export const GET_VERIFIED_COLLECTIONS = `
  query GetVerifiedCollections($first: Int!, $skip: Int!) {
    collections(
      first: $first
      skip: $skip
      orderBy: registeredAt
      orderDirection: desc
      where: { active: true, verified: true }
    ) {
      id
      creator
      tokenStandard
      metadataURI
      royaltyRecipient
      royaltyBps
      verified
      active
      listingCount
      activeListingCount
      offerCount
      activeOfferCount
      auctionCount
      activeAuctionCount
      registeredAt
    }
  }
`;

export interface CollectionFragment {
  id: string;
  creator: string;
  tokenStandard: string;
  metadataURI: string | null;
  royaltyRecipient: string | null;
  royaltyBps: number | null;
  verified: boolean;
  active: boolean;
  listingCount: number;
  activeListingCount: number;
  offerCount: number;
  activeOfferCount: number;
  auctionCount: number;
  activeAuctionCount: number;
  registeredAt: string;
  chainId?: number;
}

export interface CollectionsResult {
  collections: CollectionFragment[];
}

/**
 * Single collection by contract address (lowercase).
 * Used on: /collections/$slug detail page.
 */
export const GET_COLLECTION = `
  query GetCollection($id: ID!) {
    collection(id: $id) {
      id
      creator
      tokenStandard
      metadataURI
      royaltyRecipient
      royaltyBps
      verified
      active
      listingCount
      activeListingCount
      offerCount
      activeOfferCount
      auctionCount
      activeAuctionCount
      registeredAt
    }
  }
`;

export interface CollectionResult {
  collection: CollectionFragment | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Listings
// ─────────────────────────────────────────────────────────────────────────────

export interface ListingFragment {
  id: string;
  seller: string;
  collection: {
    id: string;
    metadataURI: string | null;
    royaltyBps: number | null;
    verified: boolean;
    tokenStandard: string;
  };
  tokenId: string;
  quantity: string;
  initialQuantity: string;
  paymentToken: string;
  pricePerItem: string;
  startTime: string;
  endTime: string;
  active: boolean;
  cancelled: boolean;
  createdAtBlock: string;
  createdAtTimestamp: string;
}

/**
 * All currently active listings (active=true), newest first.
 * Used on: Home recent NFTs section, /explore NFT grid.
 */
export const GET_ACTIVE_LISTINGS = `
  query GetActiveListings($first: Int!, $skip: Int!, $now: BigInt!) {
    listings(
      first: $first
      skip: $skip
      orderBy: createdAtTimestamp
      orderDirection: desc
      where: { active: true, cancelled: false, startTime_lte: $now, endTime_gt: $now }
    ) {
      id
      seller
      collection {
        id
        metadataURI
        royaltyBps
        verified
        tokenStandard
      }
      tokenId
      quantity
      initialQuantity
      paymentToken
      pricePerItem
      startTime
      endTime
      active
      cancelled
      createdAtBlock
      createdAtTimestamp
    }
  }
`;

export interface ActiveListingsResult {
  listings: ListingFragment[];
}

/**
 * All listings (active or not) for a specific collection contract address.
 * Used on: /collections/$slug item grid.
 *
 * Variables:
 *   collection — contract address (lowercase)
 *   first, skip — pagination
 *   now — unix seconds; only buyable listings (started, not expired)
 */
export const GET_LISTINGS_BY_COLLECTION = `
  query GetListingsByCollection($collection: String!, $first: Int!, $skip: Int!, $now: BigInt!) {
    listings(
      first: $first
      skip: $skip
      orderBy: createdAtTimestamp
      orderDirection: desc
      where: { collection: $collection, active: true, cancelled: false, startTime_lte: $now, endTime_gt: $now }
    ) {
      id
      seller
      collection {
        id
        metadataURI
        royaltyBps
        verified
        tokenStandard
      }
      tokenId
      quantity
      initialQuantity
      paymentToken
      pricePerItem
      startTime
      endTime
      active
      cancelled
      createdAtTimestamp
    }
  }
`;

/**
 * All listings by a specific seller wallet address.
 * Used on: /listings (My Listings page).
 */
export const GET_LISTINGS_BY_SELLER = `
  query GetListingsBySeller($seller: Bytes!, $first: Int!, $skip: Int!) {
    listings(
      first: $first
      skip: $skip
      orderBy: createdAtTimestamp
      orderDirection: desc
      where: { seller: $seller }
    ) {
      id
      seller
      collection {
        id
        metadataURI
        tokenStandard
      }
      tokenId
      quantity
      initialQuantity
      paymentToken
      pricePerItem
      startTime
      endTime
      active
      cancelled
      createdAtTimestamp
    }
  }
`;

export interface ListingsBySellerResult {
  listings: ListingFragment[];
}

/**
 * All listings for a specific NFT (collection + tokenId).
 * Used on: /nfts/$id detail page (listing history + active listing).
 */
export const GET_LISTINGS_FOR_ASSET = `
  query GetListingsForAsset($collection: String!, $tokenId: BigInt!) {
    listings(
      orderBy: createdAtTimestamp
      orderDirection: desc
      where: { collection: $collection, tokenId: $tokenId }
    ) {
      id
      seller
      collection {
        id
        tokenStandard
      }
      tokenId
      quantity
      initialQuantity
      paymentToken
      pricePerItem
      startTime
      endTime
      active
      cancelled
      createdAtTimestamp
    }
  }
`;

export interface ListingsForAssetResult {
  listings: ListingFragment[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Offers
// ─────────────────────────────────────────────────────────────────────────────

export interface OfferFragment {
  id: string;
  offerer: string;
  collection: {
    id: string;
    metadataURI: string | null;
    tokenStandard: string;
  };
  tokenId: string;
  quantity: string;
  paymentToken: string;
  amount: string;
  fundedAmount: string;
  expiration: string;
  active: boolean;
  createdAtBlock: string;
  createdAtTimestamp: string;
}

/**
 * Active offers for a specific NFT (collection + tokenId).
 * Used on: /nfts/$id detail page offers table.
 */
export const GET_OFFERS_FOR_ASSET = `
  query GetOffersForAsset($collection: String!, $tokenId: BigInt!, $now: BigInt!) {
    offers(
      orderBy: amount
      orderDirection: desc
      where: { collection: $collection, tokenId: $tokenId, active: true, expiration_gt: $now }
    ) {
      id
      offerer
      collection {
        id
        metadataURI
        tokenStandard
      }
      tokenId
      quantity
      paymentToken
      amount
      fundedAmount
      expiration
      active
      createdAtTimestamp
    }
  }
`;

export interface OffersForAssetResult {
  offers: OfferFragment[];
}

/**
 * All offers made by a specific wallet address.
 * Used on: /my-activity offers tab.
 */
export const GET_OFFERS_BY_USER = `
  query GetOffersByUser($offerer: Bytes!, $first: Int!, $skip: Int!) {
    offers(
      first: $first
      skip: $skip
      orderBy: createdAtTimestamp
      orderDirection: desc
      where: { offerer: $offerer }
    ) {
      id
      offerer
      collection {
        id
        metadataURI
        tokenStandard
      }
      tokenId
      quantity
      paymentToken
      amount
      fundedAmount
      expiration
      active
      createdAtTimestamp
    }
  }
`;

export interface OffersByUserResult {
  offers: OfferFragment[];
}

/**
 * All active offers on a specific collection.
 * Used on: /collections/$slug offers tab.
 */
export const GET_OFFERS_BY_COLLECTION = `
  query GetOffersByCollection($collection: String!, $first: Int!, $skip: Int!, $now: BigInt!) {
    offers(
      first: $first
      skip: $skip
      orderBy: amount
      orderDirection: desc
      where: { collection: $collection, active: true, expiration_gt: $now }
    ) {
      id
      offerer
      tokenId
      quantity
      paymentToken
      amount
      fundedAmount
      expiration
      active
      createdAtTimestamp
    }
  }
`;

export interface OffersByCollectionResult {
  offers: Array<{
    id: string;
    offerer: string;
    tokenId: string;
    quantity: string;
    paymentToken: string;
    amount: string;
    fundedAmount: string;
    expiration: string;
    active: boolean;
    createdAtTimestamp: string;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Auctions
// ─────────────────────────────────────────────────────────────────────────────

export interface AuctionFragment {
  id: string;
  seller: string;
  collection: {
    id: string;
    metadataURI: string | null;
    royaltyBps: number | null;
    verified: boolean;
    tokenStandard: string;
  };
  tokenId: string;
  quantity: string;
  paymentToken: string;
  reservePrice: string;
  highestBid: string;
  highestBidder: string | null;
  startTime: string;
  endTime: string;
  active: boolean;
  createdAtBlock: string;
  createdAtTimestamp: string;
}

/**
 * All currently active auctions.
 * Used on: /explore Auctions tab, Home auctions section.
 */
export const GET_ACTIVE_AUCTIONS = `
  query GetActiveAuctions($first: Int!, $skip: Int!) {
    auctions(
      first: $first
      skip: $skip
      orderBy: endTime
      orderDirection: asc
      where: { active: true }
    ) {
      id
      seller
      collection {
        id
        metadataURI
        royaltyBps
        verified
        tokenStandard
      }
      tokenId
      quantity
      paymentToken
      reservePrice
      highestBid
      highestBidder
      startTime
      endTime
      active
      createdAtTimestamp
    }
  }
`;

export interface ActiveAuctionsResult {
  auctions: AuctionFragment[];
}

/**
 * Active auctions for a specific collection.
 * Used on: /collections/$slug Auctions tab.
 */
export const GET_AUCTIONS_BY_COLLECTION = `
  query GetAuctionsByCollection($collection: String!, $first: Int!, $skip: Int!) {
    auctions(
      first: $first
      skip: $skip
      orderBy: endTime
      orderDirection: asc
      where: { collection: $collection, active: true }
    ) {
      id
      seller
      tokenId
      quantity
      paymentToken
      reservePrice
      highestBid
      highestBidder
      startTime
      endTime
      active
      createdAtTimestamp
    }
  }
`;

/**
 * All auctions created by a specific seller.
 * Used on: /my-activity auctions tab.
 */
export const GET_AUCTIONS_BY_SELLER = `
  query GetAuctionsBySeller($seller: Bytes!, $first: Int!, $skip: Int!) {
    auctions(
      first: $first
      skip: $skip
      orderBy: createdAtTimestamp
      orderDirection: desc
      where: { seller: $seller }
    ) {
      id
      seller
      collection {
        id
        metadataURI
        tokenStandard
      }
      tokenId
      quantity
      paymentToken
      reservePrice
      highestBid
      highestBidder
      startTime
      endTime
      active
      createdAtTimestamp
    }
  }
`;

export interface AuctionsBySellerResult {
  auctions: AuctionFragment[];
}

/**
 * All auctions for a specific NFT.
 * Used on: /nfts/$id detail page.
 */
export const GET_AUCTIONS_FOR_ASSET = `
  query GetAuctionsForAsset($collection: String!, $tokenId: BigInt!) {
    auctions(
      orderBy: createdAtTimestamp
      orderDirection: desc
      where: { collection: $collection, tokenId: $tokenId }
    ) {
      id
      seller
      tokenId
      quantity
      paymentToken
      reservePrice
      highestBid
      highestBidder
      startTime
      endTime
      active
      createdAtTimestamp
    }
  }
`;

export interface AuctionsForAssetResult {
  auctions: AuctionFragment[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Bids
// ─────────────────────────────────────────────────────────────────────────────

export interface BidFragment {
  id: string;
  auction: { id: string };
  bidder: string;
  amount: string;
  fundedAmount: string | null;
  blockNumber: string;
  timestamp: string;
  transactionHash: string;
}

/**
 * All bids for a specific auction, newest first.
 * Used on: /nfts/$id auction bid history. Poll with FAST_REFETCH_MS.
 */
export const GET_AUCTION_BIDS = `
  query GetAuctionBids($auctionId: ID!) {
    bids(
      orderBy: timestamp
      orderDirection: desc
      where: { auction: $auctionId }
    ) {
      id
      auction { id }
      bidder
      amount
      fundedAmount
      blockNumber
      timestamp
      transactionHash
    }
  }
`;

export interface AuctionBidsResult {
  bids: BidFragment[];
}

export interface UserBidFragment {
  id: string;
  auction: {
    id: string;
    seller: string;
    collection: {
      id: string;
      metadataURI: string | null;
      tokenStandard?: string;
    };
    tokenId: string;
    quantity: string;
    paymentToken: string;
    reservePrice: string;
    highestBid: string;
    highestBidder: string | null;
    startTime: string;
    endTime: string;
    active: boolean;
  };
  bidder: string;
  amount: string;
  fundedAmount: string | null;
  blockNumber: string;
  timestamp: string;
  transactionHash: string;
}

/**
 * All bids placed by a specific bidder across auctions.
 * Used on: /profile and /my-activity.
 */
export const GET_BIDS_BY_BIDDER = `
  query GetBidsByBidder($bidder: Bytes!, $first: Int!, $skip: Int!) {
    bids(
      first: $first
      skip: $skip
      orderBy: timestamp
      orderDirection: desc
      where: { bidder: $bidder }
    ) {
      id
      auction {
        id
        seller
        collection {
          id
          metadataURI
          tokenStandard
        }
        tokenId
        quantity
        paymentToken
        reservePrice
        highestBid
        highestBidder
        startTime
        endTime
        active
      }
      bidder
      amount
      fundedAmount
      blockNumber
      timestamp
      transactionHash
    }
  }
`;

export interface BidsByBidderResult {
  bids: UserBidFragment[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Sales
// ─────────────────────────────────────────────────────────────────────────────

export interface SaleFragment {
  id: string;
  type: string;
  listing: { id: string; pricePerItem: string; paymentToken: string } | null;
  offer: { id: string; amount: string; paymentToken: string } | null;
  auction: { id: string; highestBid: string; paymentToken: string } | null;
  buyer: string;
  seller: string;
  collection: { id: string; metadataURI: string | null } | null;
  tokenId: string;
  quantity: string;
  price: string;
  paymentToken: string;
  platformFee: string | null;
  royaltyAmount: string | null;
  buyerTotal: string | null;
  blockNumber: string;
  timestamp: string;
  transactionHash: string;
}

/**
 * Recent sales across the whole marketplace.
 * Used on: /activity Sales tab.
 */
export const GET_SALES = `
  query GetSales($first: Int!, $skip: Int!) {
    sales(
      first: $first
      skip: $skip
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      type
      listing { id pricePerItem paymentToken }
      offer { id amount paymentToken }
      auction { id highestBid paymentToken }
      buyer
      seller
      collection { id metadataURI }
      tokenId
      quantity
      price
      paymentToken
      platformFee
      royaltyAmount
      buyerTotal
      blockNumber
      timestamp
      transactionHash
    }
  }
`;

export interface SalesResult {
  sales: SaleFragment[];
}

export const GET_SALES_BY_COLLECTION = `
  query GetSalesByCollection($collection: String!, $first: Int!) {
    sales(
      first: $first
      skip: 0
      orderBy: timestamp
      orderDirection: desc
      where: { collection: $collection }
    ) {
      id
      price
      paymentToken
      timestamp
      tokenId
    }
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Activity
// ─────────────────────────────────────────────────────────────────────────────

export interface ActivityFragment {
  id: string;
  type: string;
  account: string;
  collection: { id: string; metadataURI: string | null } | null;
  tokenId: string | null;
  listing: {
    id: string;
    pricePerItem: string;
    paymentToken: string;
    active: boolean;
  } | null;
  offer: {
    id: string;
    amount: string;
    paymentToken: string;
    active: boolean;
  } | null;
  auction: {
    id: string;
    reservePrice: string;
    highestBid: string;
    paymentToken: string;
    active: boolean;
  } | null;
  blockNumber: string;
  timestamp: string;
  transactionHash: string;
}

/**
 * Global marketplace activity feed, newest first.
 * Used on: /activity page. Poll with DEFAULT_REFETCH_MS.
 *
 * Variables:
 *   first, skip — pagination
 *   type        — filter by event type string: "Sale" | "Listing" |
 *                 "Offer" | "Transfer" | "Mint" | null (all)
 */
export const GET_GLOBAL_ACTIVITY = `
  query GetGlobalActivity($first: Int!, $skip: Int!) {
    activities(
      first: $first
      skip: $skip
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      type
      account
      collection { id metadataURI }
      tokenId
      listing { id pricePerItem paymentToken active }
      offer { id amount paymentToken active }
      auction { id reservePrice highestBid paymentToken active }
      blockNumber
      timestamp
      transactionHash
    }
  }
`;

export const GET_GLOBAL_ACTIVITY_BY_TYPE = `
  query GetGlobalActivityByType($first: Int!, $skip: Int!, $types: [String!]!) {
    activities(
      first: $first
      skip: $skip
      orderBy: timestamp
      orderDirection: desc
      where: { type_in: $types }
    ) {
      id
      type
      account
      collection { id metadataURI }
      tokenId
      listing { id pricePerItem paymentToken active }
      offer { id amount paymentToken active }
      auction { id reservePrice highestBid paymentToken active }
      blockNumber
      timestamp
      transactionHash
    }
  }
`;

export interface GlobalActivityResult {
  activities: ActivityFragment[];
}

export const GET_ACTIVITY_BY_COLLECTION = `
  query GetActivityByCollection($collection: String!, $first: Int!) {
    activities(
      first: $first
      skip: 0
      orderBy: timestamp
      orderDirection: desc
      where: { collection: $collection }
    ) {
      id
      type
      account
      collection { id metadataURI }
      tokenId
      listing { id pricePerItem paymentToken active }
      offer { id amount paymentToken active }
      auction { id reservePrice highestBid paymentToken active }
      blockNumber
      timestamp
      transactionHash
    }
  }
`;

/**
 * Activity for a specific wallet address.
 * Used on: /my-activity page.
 */
export const GET_USER_ACTIVITY = `
  query GetUserActivity($account: Bytes!, $first: Int!, $skip: Int!) {
    activities(
      first: $first
      skip: $skip
      orderBy: timestamp
      orderDirection: desc
      where: { account: $account }
    ) {
      id
      type
      account
      collection { id metadataURI }
      tokenId
      listing { id pricePerItem paymentToken active }
      offer { id amount paymentToken active }
      auction { id reservePrice highestBid paymentToken active }
      blockNumber
      timestamp
      transactionHash
    }
  }
`;

export interface UserActivityResult {
  activities: ActivityFragment[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Tokens / Ownership
// ─────────────────────────────────────────────────────────────────────────────

export interface TokenFragment {
  id: string;
  collection: {
    id: string;
    metadataURI: string | null;
    tokenStandard: string;
    royaltyBps: number | null;
    verified: boolean;
  };
  tokenId: string;
  owner: string | null;
  mintedAtBlock: string | null;
  lastTransferBlock: string;
}

/**
 * All ERC-721 tokens owned by a wallet address.
 * Used on: /my-nfts, /profile owned count.
 *
 * Note: ERC-1155 balances use GET_ERC1155_BALANCES instead.
 */
export const GET_TOKENS_BY_OWNER = `
  query GetTokensByOwner($owner: Bytes!, $first: Int!, $skip: Int!) {
    tokens(
      first: $first
      skip: $skip
      orderBy: lastTransferBlock
      orderDirection: desc
      where: { owner: $owner }
    ) {
      id
      collection {
        id
        metadataURI
        tokenStandard
        royaltyBps
        verified
      }
      tokenId
      owner
      mintedAtBlock
      lastTransferBlock
    }
  }
`;

export interface TokensByOwnerResult {
  tokens: TokenFragment[];
}

/**
 * All tokens in a collection, ordered by tokenId.
 * Used on: /collections/$slug detail page to display both listed and unlisted items.
 */
export const GET_TOKENS_BY_COLLECTION = `
  query GetTokensByCollection($collection: String!, $first: Int!, $skip: Int!) {
    tokens(
      first: $first
      skip: $skip
      orderBy: tokenId
      orderDirection: asc
      where: { collection: $collection }
    ) {
      id
      collection {
        id
        metadataURI
        tokenStandard
        royaltyBps
        verified
      }
      tokenId
      owner
      mintedAtBlock
      lastTransferBlock
    }
  }
`;

export interface TokensByCollectionResult {
  tokens: TokenFragment[];
}

export interface Erc1155BalanceFragment {
  id: string;
  collection: {
    id: string;
    metadataURI: string | null;
    tokenStandard: string;
  };
  tokenId: string;
  account: string;
  balance: string;
}

/**
 * All ERC-1155 token balances > 0 for a wallet address.
 * Used on: /my-nfts alongside GET_TOKENS_BY_OWNER.
 */
export const GET_ERC1155_BALANCES = `
  query GetErc1155Balances($account: Bytes!, $first: Int!, $skip: Int!) {
    erc1155Balances(
      first: $first
      skip: $skip
      where: { account: $account, balance_gt: "0" }
    ) {
      id
      collection {
        id
        metadataURI
        tokenStandard
      }
      tokenId
      account
      balance
    }
  }
`;

export interface Erc1155BalancesResult {
  erc1155Balances: Erc1155BalanceFragment[];
}

/**
 * Single token by composite ID: "{collectionAddress}-{tokenId}".
 * Used on: /nfts/$id to get owner and last transfer info.
 */
export const GET_TOKEN = `
  query GetToken($id: ID!) {
    token(id: $id) {
      id
      collection {
        id
        metadataURI
        tokenStandard
        royaltyBps
        verified
      }
      tokenId
      owner
      mintedAtBlock
      lastTransferBlock
    }
  }
`;

export interface TokenResult {
  token: TokenFragment | null;
}
