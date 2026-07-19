# SignalTerrain Cyber — Data Sources

**Status:** Live engine v1.0  
**Artifact:** `data/cyber/live.json` · Health: `data/cyber/health.json`  
**Engine:** `scripts/signalterrain-cyber-live-engine.mjs`

---

## Working providers

| Provider | Endpoint | Format | Auth | Refresh | Cache | Fields used | Limitations | Failure behavior |
|----------|----------|--------|------|---------|-------|-------------|-------------|------------------|
| CISA KEV | `https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json` | JSON | None | Manual / scheduled engine run | Last-good live artifact | CVE, vendor, product, dates, action, ransomware flag | Cap `CYBER_MAX_KEV` (default 200 newest) | Error status; retain previous KEV if present |
| NIST NVD | `https://services.nvd.nist.gov/rest/json/cves/2.0` | JSON API 2.0 | Optional `NVD_API_KEY` | Engine run | Live artifact | CVE, description, CVSS, CWE, dates | Cap `CYBER_MAX_NVD` (default 40); rate limits without key | Error; no fake CVEs |
| CISA Advisories | `https://www.cisa.gov/cybersecurity-advisories/all.xml` | Atom/RSS | None | Engine run | Live artifact | title, link, date, summary, CVE extract | Feed structure may change | Error; Partial trust state |
| Chrome Releases | `https://chromereleases.googleblog.com/feeds/posts/default?alt=rss` | Atom | None | Engine run | Live artifact | title, link, date, summary | Security + non-security posts mixed | Error if empty |
| Ubuntu USN | `https://ubuntu.com/security/notices/rss.xml` | RSS | None | Engine run | Live artifact | title, link, date, summary, CVE extract | Linux-focused | Error |

## Planned (not simulated)

| Provider | Notes |
|----------|-------|
| Mozilla MFSA | Prior RSS URL 404 — not faked |
| Microsoft MSRC | CVRF/API planned |
| Apple Security Releases | No stable feed wired |
| Cisco PSIRT | Planned |
| FIRST EPSS | Secondary after required stabilize |
| Fortinet / VMware / GitHub / Red Hat | Prefer official machine-readable feeds before wiring |

---

## Environment

See `automation/cyber/.env.example`.

```bash
node scripts/signalterrain-cyber-live-engine.mjs
```

Never place API keys in frontend code or `localStorage`.
