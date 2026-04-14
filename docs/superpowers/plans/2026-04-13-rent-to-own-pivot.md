# Rent-to-Own Pivot — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all "owner finance" copy from the public website, strip RMLO/NMLS compliance disclosures from the footer, rename the admin "Owner Finance" checkbox to "Lease", and add a per-property Lease pricing line on the detail page.

**Architecture:** This is a content/copy pivot plus a small admin schema change. No backend/architecture changes. The `type` array on each property keeps its shape — only the valid values change (`"owner-finance"` → `"lease"`). Verification is visual (screenshots + grep), since this project has no test framework.

**Tech Stack:** Static HTML/CSS/vanilla JS, Node local server (`serve.mjs`), Puppeteer screenshotting (`screenshot.mjs`), Supabase Postgres backend via `api/properties.js`.

---

## File Map

**Modify:**
- `admin.html` — checkbox rename, card badge rename, save/load value rename
- `data/properties.json` — seed data: strip `owner-finance` from `type` arrays
- `index.html` — hero copy, remove Services section, How-It-Works copy, Why copy, testimonial, FAQ, `typeLabel()` helper, footer disclosure block
- `properties.html` — hero copy, remove filter bar, simplify `tagLabel()` helper, footer disclosure block
- `property.html` — type badge rendering, footer disclosure block, new Lease pricing line

**Create:**
- `docs/supabase-migrations/2026-04-13-rent-to-own-pivot.sql` — SQL migration that strips `owner-finance` from the live Supabase `properties.type` array

**Unchanged:** `api/properties.js`, `api/properties/[id].js`, `api/_supabase.js`, `api/_auth.js`, `api/upload.js`, `serve.mjs` — the backend API is transparent and passes `type` through without inspecting its values.

---

## Task 1: Baseline screenshots + server up

**Files:** none modified; verification only

- [ ] **Step 1: Kill any stale server process**

```bash
pkill -f "node serve.mjs" 2>/dev/null; true
```

Expected: exits cleanly whether a server was running or not.

- [ ] **Step 2: Start the dev server in the background**

```bash
node serve.mjs &
sleep 1
```

Expected: server listening on `http://localhost:3000`.

- [ ] **Step 3: Screenshot current homepage, properties page, and property detail page**

```bash
node screenshot.mjs http://localhost:3000 before-home
node screenshot.mjs http://localhost:3000/properties before-props
node screenshot.mjs http://localhost:3000/property/p1 before-detail
node screenshot.mjs http://localhost:3000/admin.html before-admin
```

Expected: four PNGs saved under `temporary screenshots/` with `-before-*` suffixes.

- [ ] **Step 4: Read each screenshot with the Read tool to confirm baseline state**

Read all four PNG files. Confirm visually: homepage shows Services section with RTO + OF cards, footer shows NMLS disclosure, properties page has the 3-button filter bar, admin shows the OF checkbox.

- [ ] **Step 5: No commit — this task is verification only.**

---

## Task 2: Admin — rename Owner Finance → Lease

**Files:**
- Modify: `admin.html:390-391` (checkboxes)
- Modify: `admin.html:546-547` (card badges)
- Modify: `admin.html:720-721` (load for edit)
- Modify: `admin.html:755-756` (save)

- [ ] **Step 1: Rename the checkbox (line 391)**

Find:
```html
            <label class="check-label"><input type="checkbox" id="f-of"  value="owner-finance"> Owner Finance</label>
```

Replace with:
```html
            <label class="check-label"><input type="checkbox" id="f-lease" value="lease"> Lease</label>
```

- [ ] **Step 2: Rename the card badge rendering (line 547)**

Find:
```html
            ${(p.type||[]).includes('owner-finance') ? '<span class="type-badge of">Owner Finance</span>' : ''}
```

Replace with:
```html
            ${(p.type||[]).includes('lease') ? '<span class="type-badge lease">Lease</span>' : ''}
```

- [ ] **Step 3: Rename the load-for-edit handler (line 721)**

Find:
```javascript
    document.getElementById('f-of').checked   = (p.type||[]).includes('owner-finance');
```

Replace with:
```javascript
    document.getElementById('f-lease').checked = (p.type||[]).includes('lease');
```

- [ ] **Step 4: Rename the save handler (line 756)**

Find:
```javascript
    if (document.getElementById('f-of').checked)  types.push('owner-finance');
```

Replace with:
```javascript
    if (document.getElementById('f-lease').checked) types.push('lease');
```

- [ ] **Step 5: Update the badge CSS class**

Grep `admin.html` for `.type-badge.of`:

```bash
grep -n "type-badge.of\|\.type-badge\.lease" admin.html
```

For each `.type-badge.of` CSS selector found, rename to `.type-badge.lease`. If no selector exists (inline styles only), skip this step. The visual color may end up identical to before — that's fine, we're not redesigning.

- [ ] **Step 6: Verify no remaining `f-of` or `owner-finance` references in admin.html**

```bash
grep -n "f-of\|owner-finance" admin.html
```

Expected: zero matches. If any match: go back and fix.

- [ ] **Step 7: Commit**

```bash
git add admin.html
git commit -m "Admin: rename Owner Finance checkbox to Lease"
```

---

## Task 3: Data migration — seed JSON + Supabase

**Files:**
- Modify: `data/properties.json`
- Create: `docs/supabase-migrations/2026-04-13-rent-to-own-pivot.sql`

- [ ] **Step 1: Update `data/properties.json` — strip `owner-finance` from all `type` arrays**

For each of the 3 properties (`p1`, `p2`, `p3`), change:
```json
      "type": [
        "rent-to-own",
        "owner-finance"
      ],
```

To:
```json
      "type": [
        "rent-to-own"
      ],
```

- [ ] **Step 2: Fix property p1's description text**

Find:
```
A great opportunity for buyers looking for flexibility through rent-to-own or owner financing.
```

Replace with:
```
A great opportunity for buyers looking for a flexible path to ownership through our rent-to-own program.
```

- [ ] **Step 3: Verify no `owner-finance` or `owner financing` in data/properties.json**

```bash
grep -i "owner.?finance\|owner financing" data/properties.json
```

Expected: zero matches.

- [ ] **Step 4: Create the Supabase migration SQL file**

Create `docs/supabase-migrations/2026-04-13-rent-to-own-pivot.sql` with this exact content:

```sql
-- Rent-to-own pivot: strip 'owner-finance' from properties.type arrays.
-- Leaves 'rent-to-own' and any future 'lease' values intact.
-- Safe to re-run: array_remove is idempotent.

UPDATE properties
SET type = array_remove(type, 'owner-finance')
WHERE 'owner-finance' = ANY(type);

-- Verify: should return zero rows.
-- SELECT id, title, type FROM properties WHERE 'owner-finance' = ANY(type);
```

- [ ] **Step 5: Commit**

```bash
git add data/properties.json docs/supabase-migrations/2026-04-13-rent-to-own-pivot.sql
git commit -m "Data: strip owner-finance from seed + add Supabase migration"
```

- [ ] **Step 6: Run the Supabase migration (MANUAL USER STEP — does not block the rest of the plan)**

Tell the user: *"The SQL migration at `docs/supabase-migrations/2026-04-13-rent-to-own-pivot.sql` needs to be run against the live Supabase database. You can run it via the Supabase dashboard SQL editor, or I can run it via the Supabase CLI if you'd like me to."*

Proceed with Task 4 regardless — the frontend changes don't block on the data migration.

---

## Task 4: Homepage cleanup — index.html

**Files:** Modify: `index.html`

This task has multiple small copy edits + one section removal + one footer removal. Do them in order.

### 4a. Hero subtitle (line 806)

- [ ] **Step 1: Rewrite the hero subtitle**

Find:
```html
    <p class="hero-sub" id="heroSub">
      Rent-to-Own and Owner Finance available on every property — no bank required, flexible credit review, no red tape.
    </p>
```

Replace with:
```html
    <p class="hero-sub" id="heroSub">
      Rent-to-Own available on every property — no bank required, flexible credit review, no red tape.
    </p>
```

### 4b. Services section removal (approximately lines 839–890)

- [ ] **Step 2: Delete the entire Services section**

Find the block starting at `<!-- ─── SERVICES ──────────────────────────────── -->` (line 839) through the closing `</section>` on line 890. Delete the entire block, including the opening HTML comment and the blank line before the next section.

The line immediately before the deletion is `</section>` (end of hero, line 836). The line immediately after should be the opening of the How It Works section: `<!-- ─── HOW IT WORKS ──────────────────────────── -->`.

Exact text to delete (inclusive):
```html


<!-- ─── SERVICES ──────────────────────────────── -->
<section id="services" class="s">
  ... (entire section content through the closing </section>)
</section>
```

After deletion, verify the transition looks like:
```html
  </div>

  <div class="scroll-hint">
    <span>Scroll</span>
    ...
  </div>
</section>


<!-- ─── HOW IT WORKS ──────────────────────────── -->
<section id="process" class="s">
```

- [ ] **Step 3: Grep to confirm no `id="services"` references remain**

```bash
grep -n 'id="services"\|href="#services"' index.html
```

If any `href="#services"` links exist in the nav, change them to `href="#process"` (the next section). Otherwise skip.

### 4c. How It Works step 3 copy (line 932)

- [ ] **Step 4: Rewrite step 3 heading and paragraph**

Find:
```html
        <h3 class="step-h">Choose Your Path</h3>
        <p class="step-p">Select Rent-to-Own or Owner Finance — whichever fits your lifestyle.</p>
```

Replace with:
```html
        <h3 class="step-h">Review Your Terms</h3>
        <p class="step-p">Review your Rent-to-Own terms, move-in costs, and monthly payment — clear and upfront.</p>
```

### 4d. Why section copy (line 986)

- [ ] **Step 5: Rewrite the "Why" body paragraph**

Find:
```html
        <p class="why-body-copy">Our specialized direct financing and rent-to-own programs are built specifically for Texas families — providing a fast, transparent, and accessible way to start building your legacy today.</p>
```

Replace with:
```html
        <p class="why-body-copy">Our specialized rent-to-own program is built specifically for Texas families — providing a fast, transparent, and accessible way to start building your legacy today.</p>
```

### 4e. Testimonial rewrite (line 1062)

- [ ] **Step 6: Rewrite the owner-finance testimonial**

Find:
```html
        <p class="test-q">"TxPropertySource made our dream possible when no bank would. The Owner Finance path was straightforward and fast. Highly recommend!"</p>
```

Replace with:
```html
        <p class="test-q">"TxPropertySource made our dream possible when no bank would. Their Rent-to-Own program was straightforward and fast. Highly recommend!"</p>
```

### 4f. FAQ rewrite (line 1298–1300)

- [ ] **Step 7: Rewrite FAQ answer about owner finance**

Find:
```javascript
  { q: 'Are all homes eligible for Rent-to-Own?',
    a: 'Yes — every property in our Texas inventory is offered under both Rent-to-Own and Owner Finance. You select the home and the path that fits you, subject to each listing\'s specific terms.' },
```

Replace with:
```javascript
  { q: 'Are all homes eligible for Rent-to-Own?',
    a: 'Yes — every property in our Texas inventory is offered under our Rent-to-Own program, subject to each listing\'s specific terms.' },
```

### 4g. `typeLabel()` helper simplification (lines 1340–1344)

- [ ] **Step 8: Simplify the helper**

Find:
```javascript
    const hasRTO = types.includes('rent-to-own');
    const hasOF  = types.includes('owner-finance');
    if (hasRTO && hasOF) return 'Rent to Own &amp; Owner Finance';
    if (hasRTO)          return 'Rent to Own';
    return 'Owner Finance';
```

Replace with:
```javascript
    return 'Rent to Own';
```

(The homepage only surfaces Rent-to-Own as a tag label, per the design.)

### 4h. Footer disclosure block removal (lines 1148–1152)

- [ ] **Step 9: Delete the compliance disclosure block**

Find:
```html
  <div style="max-width:1100px;margin:32px auto 0;padding:24px 60px 0;border-top:1px solid rgba(235,220,200,.1);font-size:10px;line-height:1.6;color:rgba(235,220,200,.42);letter-spacing:.02em;">
    <p style="margin-bottom:10px;font-weight:500;color:rgba(235,220,200,.6);">AADP Lending LLC &middot; NMLS #2528293 &nbsp;|&nbsp; Aron Paul Anderson &middot; NMLS #2491338 &nbsp;|&nbsp; Equal Housing Opportunity</p>
    <p style="margin:0 0 10px;">Properties are sold by entities under common ownership with AADP Lending LLC. Financing through AADP Lending is offered as an option — buyers are not required to use AADP Lending and may use any lender of their choice.</p>
    <p style="margin:0;">Consumers wishing to file a complaint against a company or a residential mortgage loan originator should complete and send a complaint form to the Texas Department of Savings and Mortgage Lending, 2601 North Lamar, Suite 201, Austin, Texas 78705. Complaint forms and instructions may be obtained from the department's website at www.sml.texas.gov. A toll-free consumer hotline is available at 1-877-276-5550. The department maintains a recovery fund to make payments of certain actual out-of-pocket damages sustained by borrowers caused by acts of licensed residential mortgage loan originators. A written application for reimbursement from the recovery fund must be filed with and investigated by the department prior to the payment of a claim. For more information about the recovery fund, please consult the department's website at www.sml.texas.gov.</p>
  </div>
```

Delete the entire `<div>...</div>` (all 5 lines). The line before is `</div>` (end of `.foot-inner`), the line after should be `</footer>`.

### 4i. Verify + screenshot

- [ ] **Step 10: Grep index.html for residue**

```bash
grep -ni "owner.?finance\|NMLS\|RMLO\|AADP Lending\|Aron Paul Anderson" index.html
```

Expected: zero matches. If any match: fix before committing.

- [ ] **Step 11: Screenshot the homepage**

```bash
node screenshot.mjs http://localhost:3000 after-home
```

- [ ] **Step 12: Read the screenshot and confirm visually**

Read `temporary screenshots/screenshot-N-after-home.png` with the Read tool. Confirm: hero copy is RTO-only, no Services section visible, footer has no NMLS block.

- [ ] **Step 13: Commit**

```bash
git add index.html
git commit -m "Homepage: strip owner finance + remove compliance footer"
```

---

## Task 5: Properties page cleanup — properties.html

**Files:** Modify: `properties.html`

### 5a. Hero subtitle (line 439)

- [ ] **Step 1: Rewrite hero subtitle**

Find:
```html
    <p class="page-hero-sub">Browse our full inventory of Rent-to-Own and Owner Finance homes across Houston and the surrounding areas.</p>
```

Replace with:
```html
    <p class="page-hero-sub">Browse our full inventory of Rent-to-Own homes across Houston and the surrounding areas.</p>
```

### 5b. Filter bar removal (lines 444–452)

- [ ] **Step 2: Delete the filter bar**

Find:
```html
<!-- ─── FILTER BAR ────────────────────────── -->
<div id="filters-bar">
  <div class="filters-inner">
    <button class="filter-btn active" data-filter="all">All</button>
    <button class="filter-btn" data-filter="rent-to-own">Rent to Own</button>
    <button class="filter-btn" data-filter="owner-finance">Owner Finance</button>
    <span class="filter-count" id="filterCount"></span>
  </div>
</div>
```

Delete the entire block. Preserve the blank lines on either side.

- [ ] **Step 3: Find and remove the filter JS handlers**

```bash
grep -n "filter-btn\|activeFilter\|filterCount\|data-filter" properties.html
```

For each JavaScript reference to `activeFilter`, `filter-btn` event handlers, and `filterCount` DOM manipulation — read the surrounding context, then remove those specific lines/blocks. Keep `allProperties` and the card rendering loop intact.

Typical pattern to remove: any `document.querySelectorAll('.filter-btn').forEach(...)` event wiring, plus any filter-based `if` gating in the render loop. After removal, the render loop should render all properties unconditionally.

- [ ] **Step 4: Remove the `#filters-bar` CSS block**

```bash
grep -n "filters-bar\|filter-btn\|filter-count" properties.html
```

For each CSS rule matching those selectors, delete the rule. Leave unrelated CSS alone.

### 5c. `tagLabel()` helper simplification (lines 535–542)

- [ ] **Step 5: Simplify the tag helper**

Find:
```javascript
function tagLabel(types) {
  if (!types || !types.length) return { label: 'Available', cls: 'prop-tag' };
  const hasRTO = types.includes('rent-to-own');
  const hasOF  = types.includes('owner-finance');
  if (hasRTO && hasOF) return { label: 'Rent to Own &amp; Owner Finance', cls: 'prop-tag prop-tag-both' };
  if (hasRTO)          return { label: 'Rent to Own', cls: 'prop-tag prop-tag-rto' };
  return               { label: 'Owner Finance', cls: 'prop-tag prop-tag-of' };
}
```

Replace with:
```javascript
function tagLabel(types) {
  if (!types || !types.length) return { label: 'Available', cls: 'prop-tag' };
  return { label: 'Rent to Own', cls: 'prop-tag prop-tag-rto' };
}
```

- [ ] **Step 6: Remove orphaned CSS classes**

```bash
grep -n "prop-tag-of\|prop-tag-both" properties.html
```

For any matches (CSS rules only — not the `tagLabel` function we just simplified), delete the rules.

### 5d. Footer disclosure block removal (lines 496–500)

- [ ] **Step 7: Delete the compliance disclosure block**

Find the same `<div>` block as Task 4 Step 9 (the one with `max-width:1100px` and `AADP Lending` NMLS text), but inside `properties.html`. Delete the entire `<div>...</div>`.

### 5e. Verify + screenshot

- [ ] **Step 8: Grep properties.html for residue**

```bash
grep -ni "owner.?finance\|NMLS\|RMLO\|AADP Lending\|Aron Paul Anderson\|filters-bar\|filter-btn" properties.html
```

Expected: zero matches.

- [ ] **Step 9: Screenshot the properties page**

```bash
node screenshot.mjs http://localhost:3000/properties after-props
```

- [ ] **Step 10: Read the screenshot**

Confirm: hero subtitle is RTO-only, no filter bar visible, all property cards render, footer has no NMLS block.

- [ ] **Step 11: Commit**

```bash
git add properties.html
git commit -m "Properties page: remove filters + OF copy + compliance footer"
```

---

## Task 6: Property detail page — property.html

**Files:** Modify: `property.html`

### 6a. Type badge rendering (line 433)

- [ ] **Step 1: Remove the owner-finance badge render line**

Find:
```javascript
  if ((p.type||[]).includes('owner-finance'))  typesEl.innerHTML += `<span class="prop-type-badge badge-of">Owner Finance</span>`;
```

Delete this entire line.

### 6b. New Lease pricing line on detail page

- [ ] **Step 2: Read the monthly price rendering block**

Read `property.html` lines 285–300 to see the full context of the monthly price display.

- [ ] **Step 3: Add a lease pricing element to the DOM**

Find (around line 289–292):
```html
          <!-- Monthly payment -->
          <div id="monthly-block">
            <div class="price-monthly-lbl">Monthly Rent</div>
            <div class="price-monthly" id="price-monthly">—</div>
```

Replace with:
```html
          <!-- Monthly payment -->
          <div id="monthly-block">
            <div class="price-monthly-lbl">Monthly Rent</div>
            <div class="price-monthly" id="price-monthly">—</div>
            <div id="lease-block" style="display:none;margin-top:10px;">
              <div class="price-monthly-lbl">Lease Option</div>
              <div class="price-monthly" id="price-lease">—</div>
            </div>
```

Keep the rest of the block (including the closing `</div>` tags) unchanged.

- [ ] **Step 4: Update the JS that sets the monthly price**

Find (around line 453):
```javascript
  document.getElementById('price-monthly').textContent = p.monthly ? fmtPrice(p.monthly) + '/mo' : 'Contact Us';
```

Add these lines immediately after:
```javascript
  const leaseBlock = document.getElementById('lease-block');
  if ((p.type||[]).includes('lease')) {
    document.getElementById('price-lease').textContent = p.monthly ? fmtPrice(p.monthly) + '/mo' : 'Contact Us';
    leaseBlock.style.display = '';
  } else {
    leaseBlock.style.display = 'none';
  }
```

### 6c. Footer disclosure block removal (lines 327–330)

- [ ] **Step 5: Delete the compliance disclosure block**

Find the same `<div>` block as the other two pages (`max-width:1100px`, `AADP Lending`, NMLS, etc.) and delete the entire `<div>...</div>`.

### 6d. Verify + screenshot

- [ ] **Step 6: Grep property.html for residue**

```bash
grep -ni "owner.?finance\|NMLS\|RMLO\|AADP Lending\|Aron Paul Anderson\|badge-of" property.html
```

Expected: zero matches.

- [ ] **Step 7: Screenshot the detail page (RTO-only property, since all 3 seeds are RTO-only after Task 3)**

```bash
node screenshot.mjs http://localhost:3000/property/p1 after-detail-rto
```

Read the screenshot. Confirm: no Owner Finance badge, monthly rent still shows, no lease block (since p1 doesn't have `"lease"` in type), footer has no NMLS block.

- [ ] **Step 8: Commit**

```bash
git add property.html
git commit -m "Property detail: strip OF + add lease pricing block + drop compliance footer"
```

---

## Task 7: Global residue sweep

**Files:** Modify: whatever is flagged

- [ ] **Step 1: Grep the whole project for OF/compliance residue in HTML**

```bash
grep -rni "owner.?finance\|NMLS\|RMLO\|AADP Lending\|Aron Paul Anderson\|sml\.texas\.gov\|residential mortgage loan originator" --include="*.html" .
```

Expected: zero matches in HTML files. If matches surface in docs/specs/plans (this file, the spec), that's fine — those are historical records.

- [ ] **Step 2: Grep for residue in JSON/JS**

```bash
grep -rni "owner.?finance" --include="*.json" --include="*.js" --include="*.mjs" . | grep -v node_modules
```

Expected: zero matches outside of `docs/` and `node_modules`.

- [ ] **Step 3: If anything was flagged, fix in place and commit**

If Step 1 or Step 2 surfaced new matches (e.g. a nav link `href="#services"` I missed, or an inline comment), edit those files inline, then:

```bash
git add -u
git commit -m "Cleanup: final residue sweep for owner finance + compliance copy"
```

If nothing was flagged, skip the commit.

---

## Task 8: End-to-end verification

**Files:** none modified

- [ ] **Step 1: End-to-end screenshot pass (desktop)**

```bash
node screenshot.mjs http://localhost:3000 final-home
node screenshot.mjs http://localhost:3000/properties final-props
node screenshot.mjs http://localhost:3000/property/p1 final-detail
node screenshot.mjs http://localhost:3000/admin.html final-admin
```

Read all 4 screenshots. For each, confirm the checklist below.

- [ ] **Step 2: Homepage checklist**

Read `final-home` screenshot and confirm:
- Hero subtitle mentions Rent-to-Own only (no "Owner Finance")
- No Services section (the "Foundation of Your Dream Home" card pair)
- "How It Works" step 3 reads "Review Your Terms" (not "Choose Your Path")
- Footer has no NMLS/AADP Lending/compliance paragraph block

- [ ] **Step 3: Properties page checklist**

Read `final-props` screenshot and confirm:
- Hero subtitle mentions Rent-to-Own only
- No filter bar (no "All / Rent to Own / Owner Finance" buttons)
- Property cards still render (3 properties visible or skeleton-free empty state)
- Each property card badge reads "Rent to Own" (not "Owner Finance")
- Footer has no NMLS block

- [ ] **Step 4: Property detail checklist (RTO-only property)**

Read `final-detail` screenshot and confirm:
- No Owner Finance badge in the type badge row
- Monthly Rent price displays normally
- No Lease Option block visible (p1 is RTO-only)
- Footer has no NMLS block

- [ ] **Step 5: Test the Lease pricing block manually**

This is the only behavior we need to test dynamically since no seed property has `"lease"` in its `type` array. Temporarily edit `data/properties.json` and add `"lease"` to p1's type array (next to `"rent-to-own"`):

```json
      "type": [
        "rent-to-own",
        "lease"
      ],
```

Then screenshot:

```bash
node screenshot.mjs http://localhost:3000/property/p1 final-detail-with-lease
```

Read the screenshot. Confirm the Lease Option block appears below the Monthly Rent block, with the same `/mo` value.

- [ ] **Step 6: Revert the temporary lease tag**

Revert the change to `data/properties.json` so p1 is back to RTO-only. **Do not commit the test change.**

```bash
git checkout -- data/properties.json
```

- [ ] **Step 7: Admin page checklist**

Read `final-admin` screenshot and confirm:
- The "Lease" checkbox is visible (where "Owner Finance" used to be)
- The checkbox label reads exactly "Lease"
- Property cards in the admin list show the "Lease" badge instead of "Owner Finance" on any property that has lease in its type (none in seed — check manually by clicking Edit on a property and seeing both checkboxes)

- [ ] **Step 8: Final grep sweep**

```bash
grep -rni "owner.?finance\|AADP Lending\|NMLS" --include="*.html" --include="*.json" --include="*.js" . | grep -v node_modules | grep -v docs/
```

Expected: zero matches.

- [ ] **Step 9: Stop the dev server**

```bash
pkill -f "node serve.mjs"
```

- [ ] **Step 10: Tell the user the migration is pending**

Remind the user: *"Task 3 created `docs/supabase-migrations/2026-04-13-rent-to-own-pivot.sql`. Run it against the live Supabase `properties` table so existing DB rows also drop `owner-finance` from their type arrays. Until then, edits saved through the admin UI will silently strip the value on next save, but unedited rows will still carry it."*

No final commit needed — all changes are already committed task-by-task.

---

## Notes for the executor

- **No TDD here:** this is a pure copy/content pivot in a codebase with no test framework. "Tests" = screenshots + grep.
- **Screenshot-verify before moving on:** after each page change, screenshot that page and read the image before committing. This catches layout breakage that grep can't.
- **Keep commits small:** one commit per task, described in the task's final step. Don't squash.
- **Don't touch:** `api/`, `serve.mjs`, `migrate-to-supabase.mjs`, anything in `node_modules`, anything in `brand_assets`.
- **If you find something ambiguous:** stop and ask. Do not improvise content decisions — the user has strong opinions about copy.
