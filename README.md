# thestuffbuyers.com — TSB Web

Marketing website for **The Stuff Buyers LLC** — built with Next.js 14, Tailwind CSS, and Supabase.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + Poppins font
- **Form Backend:** Supabase (`form_submissions` table)
- **Deployment:** Vercel

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |

> **Never commit `.env.local`** — it's in `.gitignore`.

## Supabase Setup

Run `schema.sql` in your Supabase SQL editor to create the `form_submissions` table:

```sql
-- Copy contents of schema.sql and run in Supabase SQL Editor
```

The table captures all quote intake form submissions from the website.

## Vercel Deployment

1. Push this repo to GitHub
2. Import the repo at [vercel.com/new](https://vercel.com/new)
3. Add environment variables in the Vercel dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy — Vercel auto-deploys on every push to `main`

## Project Structure

```
app/
  page.tsx              # Single-page site (all sections)
  layout.tsx            # Root layout with Poppins font + metadata
  globals.css           # Base styles + ticker animation
  components/
    IntakeForm.tsx      # Client-side intake form (quote submission)
  api/
    submit/
      route.ts          # POST /api/submit → Supabase insert
schema.sql              # Supabase table definition
tailwind.config.ts      # Brand colors + font config
```

## Form API

`POST /api/submit` — validates and inserts to Supabase `form_submissions`.

Required fields: `name`, `email`, `item_name`, `description`, `condition`, `location`, `quantity`, `product_category`, and either `upc` or `no_upc: true`.
