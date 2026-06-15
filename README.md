# Leaf & Form — Garden Design

A minimal Next.js website for a bespoke garden design service. Visitors upload a photo of their flower bed, share preferences, and choose one of three plans via Stripe — Blueprint (£10), Blueprint + Photo (£25), or Full Plan (£75).

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in values (see below)
npm run dev
```

Open http://localhost:3000

---

## Setup checklist

### 1. Supabase

1. Create a project at https://supabase.com
2. Run this SQL in the **SQL Editor**:

```sql
create table submissions (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  name          text not null,
  email         text not null,
  location      text not null,
  color_prefs   text,
  avoid_plants  text,
  comments      text,
  photo_url     text not null,
  stripe_session_id text,
  payment_status text default 'pending'
);
```

3. Create a **Storage bucket** named `garden-photos` with **Public** access.
4. Copy your project URL and keys into `.env.local`.

### 2. Stripe

1. Create an account at https://stripe.com
2. Copy your **Secret key** and **Publishable key** into `.env.local`.
3. Seed the three tier Products + Prices in Stripe:
   ```bash
   npm run stripe:sync
   ```
   The script is idempotent — re-run it anytime tier prices or names change in `lib/tiers.ts`. It prints an env block; paste the six `STRIPE_PRODUCT_*_ID` / `STRIPE_PRICE_*_ID` values into `.env.local`. Run it again with a `sk_live_...` key to seed production, then paste those IDs into your Vercel env.
4. For local webhook testing:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhook
   ```
   Copy the `whsec_...` signing secret it shows you into `STRIPE_WEBHOOK_SECRET`.
5. For production, register a webhook in the Stripe dashboard pointing to `https://your-domain.com/api/webhook`, listening for `checkout.session.completed`.

### 3. Admin access

- Set `ADMIN_PASSWORD` to a strong password in `.env.local`.
- Set `ADMIN_COOKIE_SECRET` to any random 32-character string.
- Visit `/admin/login` and sign in with your password.

### 4. Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Add all `.env.local` variables to your Vercel project's environment variables, then redeploy.

---

## Portfolio images

Placeholder cards are defined in `data/portfolio.ts`. Replace the `imageUrl` values with your own work and drop the photos in `public/examples/`.

---

## Project structure

```
app/
  page.tsx            Landing page
  submit/page.tsx     Customer request form
  success/page.tsx    Post-payment confirmation
  admin/page.tsx      Submissions dashboard
  admin/login/        Admin login
  api/submit/         Upload photo + create Stripe session
  api/webhook/        Stripe webhook (marks submissions paid)
  api/admin/login/    Admin password → session cookie
components/
  SubmitForm.tsx      Drag-drop form (client)
  AdminTable.tsx      Submissions table + detail modal (client)
lib/
  supabase.ts         Supabase server client
  stripe.ts           Stripe instance (lazy)
data/portfolio.ts     Static example work
proxy.ts              Admin route guard (JWT cookie check)
```
