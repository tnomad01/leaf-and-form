# Changelog

Notable changes, gotchas, and migration steps. Newest first.

## Unreleased

### Added
- **Stripe Products & Prices migration.** Each tier now resolves to a stable Stripe Product + Price ID instead of inline `price_data`. Seeded with `npm run stripe:sync` (idempotent — searches by `metadata.tier` and updates in place). Six new env vars: `STRIPE_PRODUCT_{BLUEPRINT,PHOTO,FULL}_ID` and `STRIPE_PRICE_{BLUEPRINT,PHOTO,FULL}_ID`.
- **Discount codes** on the submit form. Customers enter a code → debounced live validation against Stripe → live total updates → applied as `discounts: [{ promotion_code }]` on checkout. Server re-validates on submit (defence in depth). If the customer doesn't enter anything, `allow_promotion_codes: true` is set so Stripe's own field still accepts codes as a fallback. New columns on `submissions`: `promotion_code_id`, `discount_pence`.
- **Gift cards.** Three denominations (£10/£25/£75) matching the design tiers, sold from a new `/gift` page. Each issued card is backed by a single-use Stripe Coupon (100% off, restricted to the matching Product) attached to a Stripe Promotion Code with the human-readable gift code. Recipients redeem by pasting the code into the existing discount field on the submit form — the same plumbing already validates and applies it. New `gift_cards` table, six more env vars (`STRIPE_PRODUCT_GIFT_*_ID` / `STRIPE_PRICE_GIFT_*_ID`), new admin page at `/admin/gift-cards` with a resend-email action.
- `tsx` dev-dep for running TypeScript scripts.

### Gotcha — Stripe SDK shape change

The Stripe SDK pinned in this repo uses API version `2026-04-22.dahlia`. In that version the `PromotionCode` object **no longer has a top-level `coupon` field**. It now reads as:

```ts
promo.promotion.coupon  // previously: promo.coupon
```

Expand paths shifted too: `data.promotion.coupon` (list), `promotion.coupon` (retrieve). If you see `Property 'coupon' does not exist on type 'PromotionCode'` during a build, this is why.

Treat the Stripe types in `node_modules/stripe/cjs/resources/*.d.ts` as the source of truth, not training-data memory.

### Migrations required

1. Run `npm run stripe:sync` in test mode → paste output env vars into `.env.local`. Repeat with a live key for production env. (Six new gift-card env vars are added in this release too — re-run after pulling.)
2. SQL on `submissions`:
   ```sql
   alter table submissions
     add column promotion_code_id text,
     add column discount_pence integer not null default 0;
   ```
3. SQL to create the gift cards table:
   ```sql
   create table gift_cards (
     id uuid primary key default gen_random_uuid(),
     code text not null unique,
     tier text not null check (tier in ('blueprint','photo','full')),
     price_pence integer not null,
     sender_name text not null,
     sender_email text not null,
     recipient_name text not null,
     recipient_email text not null,
     message text,
     stripe_session_id text not null,
     stripe_coupon_id text,
     stripe_promotion_code_id text,
     status text not null default 'pending'
       check (status in ('pending','active','redeemed','refunded')),
     purchased_at timestamptz not null default now(),
     delivered_at timestamptz,
     redeemed_at timestamptz,
     redeemed_submission_id uuid references submissions(id)
   );
   ```
