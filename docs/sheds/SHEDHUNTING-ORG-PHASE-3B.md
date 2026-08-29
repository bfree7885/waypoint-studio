# ShedHunting.org — Phase 3B (custom domain)

**Status:** Stopped — prerequisite not met  
**Date:** 2026-08-29  
**Do not:** flip `shedDedicatedHostEnabled`, add Studio redirects, change the `waypointstudio.org` CNAME, merge Phase 3C

Phase 3A contract: `docs/sheds/SHEDHUNTING-ORG-PHASE-3A.md`

## Stop condition

Phase 3B must not attach `shedhunting.org` until the Phase 3A host is live on github.io.

Checked 2026-08-29:

| Check | Result |
|-------|--------|
| Companion repo `bfree7885/shedhunting.org` | **Missing** (`createRepository` is not allowed to this GitHub App) |
| `https://bfree7885.github.io/shedhunting.org/` | **404** GitHub Pages “Site not found” |
| Current `https://shedhunting.org/` | Old **`bfree7885/sheds-site`** Pages project (March 2026 “Sheds \| Terrain Intelligence”), not the Phase 3A host |
| This environment’s GitHub App repos | **`bfree7885/waypoint-studio` only** |
| Registrar / DNS API in this environment | **None** |

No DNS records were changed. No Pages custom-domain was moved. Canonical/OG/sitemap on the dedicated host were **not** switched to `https://shedhunting.org` because the domain is not serving the new host.

## What currently answers `shedhunting.org`

GitHub Pages project: `bfree7885/sheds-site`

- `cname`: `shedhunting.org`
- `html_url`: `http://shedhunting.org/`
- `https_enforced`: false
- Certificate: Let’s Encrypt, `CN=shedhunting.org`, expires 2026-11-23, **no** `www` SAN
- Content: legacy Sheds landing, last-modified 2026-03-10

GitHub allows **one custom domain per Pages project**, and a domain can only be attached to **one** Pages site. The companion cannot take `shedhunting.org` until that CNAME is removed from `sheds-site`.

## DNS observed (do not delete mail)

Nameservers: `dns1.registrar-servers.com` / `dns2.registrar-servers.com` (Namecheap parking DNS).

**Keep as-is (mail):**

| Type | Name | Value |
|------|------|--------|
| `MX` | `@` | `eforward1`–`eforward3.registrar-servers.com` (10), `eforward4` (15), `eforward5` (20) |
| `TXT` | `@` | `v=spf1 include:spf.efwd.registrar-servers.com ~all` |

**Apex A records already match GitHub Pages** (no apex A change required for GitHub):

| Type | Name | Value |
|------|------|--------|
| `A` | `@` | `185.199.108.153` |
| `A` | `@` | `185.199.109.153` |
| `A` | `@` | `185.199.110.153` |
| `A` | `@` | `185.199.111.153` |

**Missing (optional follow-up, not applied):**

| Type | Name | Value | Notes |
|------|------|--------|--------|
| `AAAA` | `@` | `2606:50c0:8000::153` … `:8003::153` | GitHub-recommended IPv6; none present today |
| `CNAME` | `www` | `bfree7885.github.io` | No `www` records today; GitHub recommends this alongside the apex |

Do **not** point any `shedhunting.org` record at `waypointstudio.org`. Do **not** use a wildcard `*.shedhunting.org`.

Source: [GitHub Pages custom domains](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

## GitHub-side attach sequence (when github.io is verified)

1. Publish `dist/shedhunting/` to `bfree7885/shedhunting.org` and verify `https://bfree7885.github.io/shedhunting.org/` and `/map/`.
2. Remove custom domain `shedhunting.org` from **`bfree7885/sheds-site`** Pages (Settings → Pages → Remove). Do not delete MX/SPF at the registrar.
3. On the companion Pages project, set custom domain `shedhunting.org`. For Actions-based Pages, GitHub does not require a repo `CNAME` file (it is ignored); the Pages setting is the source of truth. If publishing from a branch, add a root `CNAME` file containing `shedhunting.org`.
4. Wait for DNS check + Let’s Encrypt. Enable **Enforce HTTPS** when GitHub permits it.
5. Optionally add apex `AAAA` and `www` `CNAME` at Namecheap. Preserve MX/SPF.
6. Only after HTTPS is valid on the **new** host: generate dedicated-host canonical/OG/sitemap for `https://shedhunting.org`. Still do **not** flip `shedDedicatedHostEnabled` or add Studio redirects (Phase 3C).

## Waypoint Studio (must stay untouched)

| Check | Value |
|-------|--------|
| Repo `CNAME` file | `waypointstudio.org` |
| Pages `cname` | `waypointstudio.org` |
| HTTPS | enforced; cert SAN `waypointstudio.org` + `www.waypointstudio.org` |
| `/apps/shed-hunting/` | still 200 |
| Origin flag | `shedDedicatedHostEnabled: false` |

## Owner unblock

1. Create public empty repo `bfree7885/shedhunting.org` (no README, no CNAME).
2. Grant the Cursor GitHub App (or a PAT `SHEDHUNTING_DEPLOY_TOKEN`) access to that repo **and** `bfree7885/sheds-site` (needed only to remove the old Pages domain).
3. Re-run Phase 3A publish, verify github.io, then resume this Phase 3B sequence.
