# SEO Package Implementation Brief
**For:** Forge / Jubilee
**Date:** 2026-03-15
**Source files:** `/tmp/tsb-seo/`
**Target:** `/Users/blakesmacmini/Projects/tsb-web/`

## Rules
1. DO NOT replace existing files wholesale — merge carefully
2. `layout.tsx` — merge metadata + JSON-LD scripts into existing layout, keep existing styles/fonts/body
3. `page.tsx` — merge FAQ section + internal link hub + JSON-LD into existing homepage, keep hero, 3-step, intake form
4. `next.config.mjs` — existing file is `.mjs` (ES module). Merge SEO package's `next.config.js` settings in carefully
5. `about/` and `training/` routes already exist as `route.ts` files — DO NOT TOUCH THEM
6. `vercel.json` — check if one exists, merge headers only, don't break existing config

## New files — drop in directly (no merging needed)
- `app/sitemap.ts`
- `app/robots.ts`
- `app/api/og/route.tsx`
- `app/sell-excess-inventory/page.tsx`
- `app/sell-dead-stock/page.tsx`
- `app/inventory-liquidation-services/page.tsx`
- `app/industries/page.tsx`
- `app/industries/[slug]/page.tsx`
- `app/blog/page.tsx`
- `components/json-ld.tsx`
- `lib/seo-constants.ts`
- `public/site.webmanifest`

## Install dependency
```bash
cd /Users/blakesmacmini/Projects/tsb-web && npm install schema-dts
```

## Deploy
```bash
cd /Users/blakesmacmini/Projects/tsb-web && bash deploy.sh "SEO package — landing pages, structured data, sitemap, robots"
```
Do NOT report success until deploy.sh shows ✅ SUCCESS.
