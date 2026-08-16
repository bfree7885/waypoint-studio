# Google Search Console — minimal setup

**Site:** `https://waypointstudio.org`  
**Sitemap:** `https://waypointstudio.org/sitemap.xml`  
**Status in repo/production HTML:** No `google-site-verification` meta and no DNS TXT record managed by this codebase.

## Owner steps (only)

1. Open [Google Search Console](https://search.google.com/search-console) with the Google account that owns Waypoint.
2. Add a **Domain** property for `waypointstudio.org` (preferred) **or** a URL-prefix property for `https://waypointstudio.org/`.
3. Complete Google’s verification (DNS TXT for Domain property, or HTML meta/file for URL-prefix).  
   Cursor will **not** invent tokens or change DNS without your authorization.
4. After verification: **Sitemaps → Add new sitemap →** `sitemap.xml` → Submit.
5. Optional: request indexing for `https://waypointstudio.org/deep-forest-dispatch/` once it is live.

Nothing else is required for DFD crawl readiness once the library is on production.
