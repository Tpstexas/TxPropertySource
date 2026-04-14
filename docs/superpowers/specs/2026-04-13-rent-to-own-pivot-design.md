# Rent-to-Own Pivot — Design

**Date:** 2026-04-13
**Scope:** Website + admin content/copy pivot. No infrastructure or architecture changes.

## Context

The business is shifting away from owner financing. Going forward:

- **Public-facing:** TxPropertySource is 100% a Rent-to-Own company. The word "owner finance" must not appear anywhere on the public site.
- **Internal / admin:** Properties can be tagged `rent-to-own`, `lease`, or both. Lease is a quiet per-property option, never promoted as a headline offering.
- **Compliance:** The business is no longer operating as an RMLO. NMLS numbers, licensing language, and the RMLO disclosure block come off the site.

## Out of Scope

- Renaming the repo, domain, or business entity
- Changes to admin authentication or backend API shape (Supabase schema stays the same)
- Any new page layouts or design work beyond removing the Services section
- Updating the Supabase `properties` table schema — `type` stays a text array, only the valid values change

## Part 1 — Admin ([admin.html](../../../admin.html))

### Checkbox labels
- Checkbox `f-rto`: label stays `Rent to Own`, value stays `rent-to-own`. **No change.**
- Checkbox `f-of`: label `Owner Finance` → **`Lease`**. DOM id should become `f-lease`, value becomes `lease`.
- All references to `f-of` in admin JS (load, save, filter) update to `f-lease`.

### Card badges in admin list
- Line 546: `rent-to-own` badge — unchanged.
- Line 547: `owner-finance` badge — becomes `lease` badge. CSS class `.type-badge.of` renamed to `.type-badge.lease` (color can stay the same — not a visual redesign).

### Save/load logic
- Line 720–721: when loading a property for edit, check `rent-to-own` and `lease` in the `type` array.
- Line 755–756: when saving, push `rent-to-own` and/or `lease` to the `types` array.

## Part 2 — Data migration ([data/properties.json](../../../data/properties.json))

Existing 3 properties each have `"type": ["rent-to-own", "owner-finance"]`. Per Question 3 answer: convert all three to `["rent-to-own"]` (drop owner-finance, do NOT add lease).

One content fix: property `p1`'s description field contains *"rent-to-own or owner financing"* — rewrite to just mention rent-to-own.

**Note:** the production data lives in Supabase, not this JSON file. The file is legacy / seed data. Implementation plan must confirm whether Supabase data also needs a migration (likely yes — a single UPDATE query against the `properties` table).

## Part 3 — Homepage ([index.html](../../../index.html))

### Copy rewrites (remove owner finance, keep layout)
- **Line 806** — hero subtitle: *"Rent-to-Own and Owner Finance available on every property — no bank required, flexible credit review, no red tape."* → rewrite as rent-to-own-only.
- **Line 932** — "How it works" step copy: *"Select Rent-to-Own or Owner Finance — whichever fits your lifestyle."* → rewrite to describe the rent-to-own path.
- **Line 986** — "Why" section body: *"Our specialized direct financing and rent-to-own programs…"* → rewrite to say rent-to-own only (drop "direct financing").
- **Line 1062** — testimonial quote mentioning "The Owner Finance path was straightforward and fast" → rewrite as a rent-to-own testimonial. Keep it generic; user can swap in a real one later.
- **Line 1298–1300** — FAQ entries mentioning owner finance → rewrite to reference rent-to-own only. Specifically the answer on line 1300 *"…every property in our Texas inventory is offered under both Rent-to-Own and Owner Finance."* needs rewriting; the "Are all homes eligible for Rent-to-Own?" question itself can stay but the answer is rewritten.
- **Lines 1340–1344** — the `typeLabel()` helper that currently returns "Rent to Own & Owner Finance" etc. → simplified to always return "Rent to Own" (since lease is never shown on the homepage).

### Section removals
- **Services section** (the RTO card + OF card pair, approximately lines 855–900) — **removed entirely**. Section spacing/rhythm preserved so adjacent sections still flow naturally.

### Footer
- Remove NMLS numbers (AADP Lending #2528293, Aron Anderson RMLO #2491338).
- Remove RMLO licensing language and disclosure block.
- Keep: logo, nav links, phone number, copyright line.

## Part 4 — Properties page ([properties.html](../../../properties.html))

- **Line 439** — hero subtitle mentioning Owner Finance → rewrite RTO-only.
- **Lines ~447–449** — filter row (`All / Rent to Own / Owner Finance` buttons) — **removed entirely**. All-filter JS handlers and related CSS removed.
- **Lines 537–541** — `tagFor()` helper that returns different labels based on `type` → simplified to always return the `Rent to Own` tag. The `.prop-tag-of` and `.prop-tag-both` classes can be removed (or left orphaned — implementation plan calls it).

## Part 5 — Property detail page ([property.html](../../../property.html))

Not yet read; implementation step 1 will audit it. Expected changes:

- Strip any owner-finance labels, copy, or badges.
- **New:** when a property has `"lease"` in its `type` array, show a second pricing line under the rent-to-own monthly price: *"Lease: $X/mo"* — using the same `monthly` value as rent-to-own (per Question 7 answer). Only appears on the detail page, not on cards or the properties listing.
- When a property is rent-to-own only (no lease), the detail page matches today's layout minus any OF wording.

## Part 6 — Global cleanup

After Parts 1–5 are applied, grep the entire project for:

- `owner.?finance` / `Owner Finance` / `owner_finance` / `of` value tokens
- `NMLS` / `RMLO`
- `f-of` DOM id residue

Anything remaining in public-facing files gets fixed. Admin authentication, backend API, Supabase schema — untouched except the `type` value rename.

## Testing & Verification

- After changes: start `node serve.mjs`, screenshot homepage, properties page, and property detail page from `http://localhost:3000`.
- Verify: no "Owner Finance" string anywhere on the public pages.
- Verify: admin list still loads, checkboxes still save, new Lease badge renders.
- Verify: property detail page shows the second pricing line when Lease is checked, and doesn't when it isn't.
- Grep the final codebase for `owner.?finance` — should return zero hits in HTML files.

## Open Questions for Implementation Plan

1. **Supabase data migration:** does the `properties` table in Supabase also need an UPDATE to strip `owner-finance` from the `type` arrays? (Very likely yes — the JSON file is legacy.)
2. **CSS cleanup:** remove orphaned `.type-badge.of`, `.prop-tag-of`, `.prop-tag-both` classes, or leave them? Implementation plan will decide based on how much collateral cleanup is warranted.
3. **Testimonial attribution:** the rewritten testimonial should be generic. User will swap in a real attributed quote later if desired.
