# Product Templates Library

## Overview
The Product Templates page is a shared React feature for the web and Capacitor Android app. It offers 16 extensible catalogue categories, cross-catalogue search, category selection, bulk selection, a review/customization step, and per-product import results. The catalogue contains product names and generic units only; it does not assign prices, barcodes, manufacturer specifications, or store stock.

## Data and security
- The catalogue is static application data in `src/components/ProductTemplatesView.tsx`; it is not copied into each store's database.
- Import writes each selected item to the existing Supabase `products` table with the active `store_id`, using the existing product columns. It does not use localStorage or a second product model.
- Supabase Row Level Security remains the authorization boundary for inserts. Import errors are shown per product; failed writes are not reported as successful.
- Store categories are reused when a matching category exists. Missing categories are inserted into the active store's existing `categories` table.
- Initial stock above zero attempts to create an `inventory_movements` record. If that movement write fails, a warning is logged; the product insert outcome is still reported accurately.
- Duplicate detection checks the target store's loaded products by case-insensitive product name. The template catalogue has no canonical SKU or barcode, so none are fabricated. Existing products are skipped rather than updated.
- Blank prices are saved as zero because the current product model uses numeric price fields. Users can change them through the existing product edit flow.

## Files
- `src/components/ProductTemplatesView.tsx`: catalogue, search, selection, review and bulk import.
- `src/components/ProductsView.tsx`: Product Management entry button.
- `src/components/Sidebar.tsx`: navigation entry.
- `src/App.tsx`: navigation routing and permission gate.
- `src/types.ts`: navigation tab type.

## Validation
Run `npm install`, `npm run lint`, and `npm run build`. For Android, run `npx cap sync android` after a successful web build. Real Supabase import, RLS and multi-store checks require a configured test account and database; do not test with production inventory unless intended.
