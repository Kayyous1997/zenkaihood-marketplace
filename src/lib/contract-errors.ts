import {
  BaseError,
  ContractFunctionRevertedError,
  UserRejectedRequestError,
} from "viem";

/**
 * Maps contract revert error names to friendly UI messages.
 * Add entries here as new errors are encountered.
 */
const ERROR_MESSAGES: Record<string, string> = {
  // Marketplace errors
  ZeroAddress: "Invalid address provided.",
  Unauthorized: "You are not authorised to perform this action.",
  InvalidListing: "This listing is invalid or has expired.",
  CollectionUnavailable: "This collection is not available on the marketplace.",
  NotOwner: "You do not own this NFT.",
  NotApproved: "The marketplace is not approved to transfer this NFT. Please approve first.",
  ListingInactive: "This listing is no longer active.",
  ListingNotStarted: "This listing has not started yet.",
  ListingExpired: "This listing has expired.",
  WrongPayment: "Incorrect payment amount or token.",
  InsufficientQuantity: "Requested quantity exceeds available supply.",
  PaymentFailed: "Payment transfer failed.",
  InvalidFee: "Platform fee exceeds the maximum allowed (10%).",
  InvalidRoyalty: "Royalty amount is invalid.",
  UnsupportedPaymentToken: "This payment token is not supported.",
  OfferInactive: "This offer is no longer active.",
  OfferExpired: "This offer has expired.",
  OfferNotExpired: "This offer has not expired yet.",
  AuctionInactive: "This auction is no longer active.",
  AuctionNotStarted: "This auction has not started yet.",
  AuctionNotEnded: "This auction has not ended yet.",
  InvalidBid: "Invalid bid — the auction already has bids and cannot be cancelled.",
  BidTooLow: "Your bid is too low. Increase by at least 5% above the current highest bid.",
  BidderCannotBeSeller: "The seller cannot place a bid on their own auction.",
  EmptySweep: "No listings selected for sweep.",
  TooManyItems: "Maximum 50 items per sweep transaction.",
  MixedPaymentTokens: "All listings in a sweep must use the same payment token.",
  InvalidSignature: "Offer signature is invalid.",
  NonceUsed: "This signed offer has already been used or has expired.",
  // Registry errors
  NotContract: "The address provided is not a deployed contract.",
  UnsupportedStandard: "Unsupported token standard.",
  InterfaceNotSupported: "The contract does not implement the required interface.",
  AlreadyRegistered: "This collection is already registered.",
  NotController: "Only the collection creator can perform this action.",
  CollectionNotRegistered: "This collection is not registered.",
  NotContractOwner: "You must be the contract owner to register this collection.",
};

/**
 * Parse any error thrown by wagmi/viem into a human-readable string.
 *
 * Priority order:
 *  1. User rejected → friendly message
 *  2. ContractFunctionRevertedError → look up named error
 *  3. BaseError shortMessage
 *  4. Generic string fallback
 */
export function parseContractError(error: unknown): string {
  if (error instanceof UserRejectedRequestError) {
    return "Transaction cancelled by user.";
  }

  if (error instanceof BaseError) {
    // Walk the error chain for a contract revert
    const revert = error.walk(
      (e) => e instanceof ContractFunctionRevertedError,
    );

    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName;
      if (name && ERROR_MESSAGES[name]) return ERROR_MESSAGES[name];
      if (name) return `Contract error: ${name}`;
      return revert.shortMessage;
    }

    return error.shortMessage;
  }

  if (error instanceof Error) return error.message;
  return String(error);
}
