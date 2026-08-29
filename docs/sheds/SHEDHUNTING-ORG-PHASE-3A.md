# ShedHunting.org — Phase 3A (dedicated host, no DNS)

**Status:** Temporary GitHub Pages destination only  
**Do not:** flip `shedDedicatedHostEnabled`, add Studio redirects, change `waypointstudio.org` CNAME, attach `shedhunting.org` DNS

Phase 2 contract: `docs/sheds/SHEDHUNTING-ORG-PHASE-2.md`

## Goal

A genuine independently addressable Shed Hunting site generated from this repository, hosted on a companion GitHub Pages project, verified on the **github.io** URL before any custom domain.

Waypoint Studio production behavior is unchanged.

## Companion repository

Preferred name: **`bfree7885/shedhunting.org`**

That repo holds **generated** files only (`dist/shedhunting/` plus a Pages workflow). Product source stays here.

Temporary URL (project Pages, no CNAME):

`https://bfree7885.github.io/shedhunting.org/`

Do **not** add a `CNAME` file in Phase 3A. An older repo (`bfree7885/sheds-site`) already has Pages `cname: shedhunting.org`; leave it alone.

## Publish

```
node scripts/prepare-shed-hunting-host.mjs
node scripts/publish-shed-hunting-host.mjs
```

Or GitHub Actions: **Publish Shed Hunting host** (`workflow_dispatch`) with secret `SHEDHUNTING_DEPLOY_TOKEN` (contents:write on the companion repo).

The Cursor GitHub App installation for this environment currently includes only `waypoint-studio`. Creating or pushing the companion repo requires the owner to:

1. Create public repo `bfree7885/shedhunting.org` (no README required; empty is fine).
2. Grant the Cursor GitHub App access to that repository, **or** add `SHEDHUNTING_DEPLOY_TOKEN` (a PAT) as a Actions secret on waypoint-studio.
3. Enable Pages: Settings → Pages → GitHub Actions (after the first workflow exists) **or** Deploy from branch `main` / root.
4. Re-run publish.

## Import JSON

Map **Export JSON** / **Import JSON** uses `sheds-field-private.json`. Merge-by-id into this origin’s localStorage. Active sessions import as `ended`. No cross-origin localStorage.

Live check (after Pages is up):

```
SHEDHUNTING_HOST_URL=https://bfree7885.github.io/shedhunting.org/ \
  node scripts/verify-shed-hunting-host-url.mjs
```

Local dedicated-host CDP (serves `dist/shedhunting/` as `/`):

```
python3 -m http.server 8770 --directory dist/shedhunting
node automation/test-shedhunting-host-cdp.mjs http://127.0.0.1:8770/
```

## Phase 3B (not this phase)

Do **not** do these now.

1. Remove `shedhunting.org` from `bfree7885/sheds-site` Pages (that repo currently holds the custom domain). GitHub allows a custom domain on only one Pages project.
2. Add a `CNAME` file containing `shedhunting.org` to **`bfree7885/shedhunting.org`** (the companion), or set the custom domain in that repo’s Pages settings.
3. DNS at the registrar (confirm against current GitHub Pages custom-domain docs):

   Apex `shedhunting.org`:

   - `A` `@` `185.199.108.153`
   - `A` `@` `185.199.109.153`
   - `A` `@` `185.199.110.153`
   - `A` `@` `185.199.111.153`
   - `AAAA` `@` `2606:50c0:8000::153`
   - `AAAA` `@` `2606:50c0:8001::153`
   - `AAAA` `@` `2606:50c0:8002::153`
   - `AAAA` `@` `2606:50c0:8003::153`

   `www.shedhunting.org`:

   - `CNAME` `www` `bfree7885.github.io`

   If the DNS host supports CNAME flattening, `CNAME` `@` `bfree7885.github.io` can replace the A/AAAA set. Do **not** point the CNAME at `waypointstudio.org`.
4. Enable HTTPS on the companion Pages project.
5. Flip `shedDedicatedHostEnabled`, Studio redirects, and canonicals — only when asked.
6. Change generated robots/meta from Disallow/noindex to public indexing.
