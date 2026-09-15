# Zenkaihood NFT Marketplace Replica

## Goal
Recreate the four supplied reference screens as a polished, responsive website, using the uploads strictly as visual references rather than embedding screenshots.

## Pages
- **Explore (`/`)** — full marketplace landing screen with navigation, illustrated hero, featured collections, trending NFT cards, and recently listed activity.
- **Collection (`/collections/the-ronin`)** — The Ronin banner, collection statistics, tabs, filters, sorting controls, and the 10-item NFT gallery shown in the reference.
- **Activity (`/activity`)** — illustrated heading, activity category rail, event tabs, event feed, filter controls, and marketplace totals.
- **Create Listing (`/create`)** — account rail, NFT selection, price/payment fields, expiration and advanced options, plus the live listing summary.

## Visual Fidelity
- Match the warm parchment background, ink-like navy typography, vermilion highlights, fine borders, compact spacing, and restrained shadows.
- Use an editorial serif for headings and a readable serif/sans pairing for interface copy.
- Generate a cohesive set of original Japanese ink-wash landscapes, samurai portraits, shrine scenes, lotus art, and collection imagery matching the references.
- Recreate the red seal-inspired Zenkaihood mark and decorative calligraphy as original UI artwork.
- Preserve the reference composition on desktop while adapting navigation, filters, cards, tables, and side panels for the current mobile viewport.

## Interactions
- Connect all navigation links between the four pages.
- Implement collection/activity tabs, sorting, dropdown filters, checkboxes, list/grid controls, favorites, share, and collapsible advanced options as working interface controls.
- Make the listing price update the calculated fee, royalty, and seller proceeds shown in the summary.
- Use a clear preview dialog for wallet connection and listing review; no blockchain transaction or real wallet connection is included.

## Technical Details
- Build shared navigation, artwork/card, filter, activity-row, and listing-form components with the existing React design system.
- Define the complete semantic color and typography system in the global stylesheet and add page-specific metadata for every route.
- Keep marketplace content as local sample data matching the supplied screens; no database or authentication is required.
- Verify clean builds and inspect all four pages at desktop and mobile sizes for spacing, overflow, legibility, and interaction behavior.
