# Polish & Extend: NFT Detail + Motion

## Goal
Add a dedicated NFT detail page and introduce subtle, cohesive motion across the marketplace.

## Scope

### 1. NFT Detail Page
- New route: `/nfts/$id` (file `src/routes/nfts.$id.tsx`).
- Display large artwork, name/token ID, collection, price, traits, listing history, and action buttons (Buy Now / Make Offer / Share).
- Link every `NftCard` and `OwnedCard` to `/nfts/$id`.
- Use sample data from `nfts`/`owned` arrays; derive the item by ID from the URL param.

### 2. Motion & Micro-interactions
- Add CSS keyframes for fade-in, slide-up, and scale-in to `src/styles.css`.
- Apply staggered entrance animations to card grids and section content.
- Enhance card hover: lift shadow, border glow, image zoom.
- Add press feedback on buttons and active nav states.
- Animate the favorite heart toggle (scale pop + fill).
- Smooth mobile menu open/close transition.
- Respect `prefers-reduced-motion`.

### 3. Navigation & Metadata
- Update route tree by adding the new file.
- Add route-specific `head()` metadata for the detail page.
- Ensure all existing pages still link correctly.

## Verification
- Build passes.
- Preview the home, collection, and new NFT detail pages.
- Confirm cards link to detail page and hover/entrance animations render.
