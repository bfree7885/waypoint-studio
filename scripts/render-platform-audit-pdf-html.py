#!/usr/bin/env python3
"""Render PLATFORM-AUDIT markdown to print-ready HTML (content preserved)."""
from __future__ import annotations

import html
import pathlib
import re
import markdown
from markdown.extensions.toc import slugify

ROOT = pathlib.Path(__file__).resolve().parents[1]
MD_PATH = ROOT / "docs" / "PLATFORM-AUDIT-2026-07.md"
OUT_HTML = ROOT / "docs" / ".platform-audit-2026-07.print.html"

md_text = MD_PATH.read_text(encoding="utf-8")

md = markdown.Markdown(
    extensions=[
        "tables",
        "fenced_code",
        "sane_lists",
        "smarty",
        "toc",
        "attr_list",
    ],
    extension_configs={
        "toc": {
            "permalink": False,
            "toc_depth": "1-3",
            "title": "Table of Contents",
        }
    },
)
body = md.convert(md_text)
toc_html = md.toc

title_page = f"""
<section class="title-page" aria-label="Title page">
  <div class="title-page__inner">
    <p class="title-page__eyebrow">Waypoint Studio</p>
    <h1 class="title-page__title">Full Platform Engineering Audit Report</h1>
    <p class="title-page__subtitle">Stability, Hardening &amp; Architecture Review</p>
    <dl class="title-page__meta">
      <div><dt>Report date</dt><dd>12 July 2026</dd></div>
      <div><dt>Document</dt><dd>PLATFORM-AUDIT-2026-07</dd></div>
      <div><dt>Branch</dt><dd>main</dd></div>
      <div><dt>Audience</dt><dd>Senior engineering handoff</dd></div>
    </dl>
    <p class="title-page__note">This PDF is a presentation of the Markdown source. Report content is unchanged.</p>
  </div>
</section>
"""

doc = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Waypoint Studio — Platform Audit 2026-07</title>
  <style>
    :root {{
      --ink: #1a1f1c;
      --muted: #4a554e;
      --rule: #d5ddd6;
      --accent: #2f5d4a;
      --code-bg: #f4f6f4;
      --surface: #fafbfa;
    }}
    * {{ box-sizing: border-box; }}
    html {{ font-size: 11pt; }}
    body {{
      margin: 0;
      color: var(--ink);
      font-family: "Source Serif 4", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
      line-height: 1.55;
      background: white;
    }}
    .page {{
      max-width: 7.5in;
      margin: 0 auto;
      padding: 0 0.15in;
    }}
    .title-page {{
      min-height: 9.5in;
      display: flex;
      align-items: center;
      page-break-after: always;
      break-after: page;
    }}
    .title-page__inner {{
      width: 100%;
      border-top: 3px solid var(--accent);
      border-bottom: 1px solid var(--rule);
      padding: 1.75rem 0 2rem;
    }}
    .title-page__eyebrow {{
      margin: 0 0 1rem;
      font-family: "IBM Plex Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
      font-size: 0.85rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--accent);
      font-weight: 600;
    }}
    .title-page__title {{
      margin: 0 0 0.75rem;
      font-size: 2.15rem;
      line-height: 1.15;
      font-weight: 600;
      letter-spacing: -0.02em;
    }}
    .title-page__subtitle {{
      margin: 0 0 2rem;
      font-size: 1.15rem;
      color: var(--muted);
    }}
    .title-page__meta {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.85rem 1.5rem;
      margin: 0 0 1.75rem;
      font-family: "IBM Plex Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
      font-size: 0.92rem;
    }}
    .title-page__meta dt {{
      margin: 0;
      color: var(--muted);
      font-size: 0.72rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }}
    .title-page__meta dd {{
      margin: 0.15rem 0 0;
      font-weight: 500;
    }}
    .title-page__note {{
      margin: 0;
      font-size: 0.85rem;
      color: var(--muted);
      font-family: "IBM Plex Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
    }}
    .toc-page {{
      page-break-after: always;
      break-after: page;
      padding-top: 0.25in;
    }}
    .toc-page h2 {{
      margin: 0 0 1rem;
      font-size: 1.45rem;
      color: var(--accent);
      border-bottom: 1px solid var(--rule);
      padding-bottom: 0.4rem;
    }}
    .toc {{
      font-family: "IBM Plex Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
      font-size: 0.92rem;
    }}
    .toc ul {{
      list-style: none;
      margin: 0;
      padding: 0;
    }}
    .toc ul ul {{
      padding-left: 1rem;
      margin-top: 0.2rem;
    }}
    .toc li {{
      margin: 0.28rem 0;
    }}
    .toc a {{
      color: var(--ink);
      text-decoration: none;
      border-bottom: 1px dotted var(--rule);
    }}
    .report-body h1 {{
      font-size: 1.55rem;
      margin: 1.75rem 0 0.85rem;
      color: var(--accent);
      page-break-after: avoid;
      break-after: avoid;
      border-bottom: 1px solid var(--rule);
      padding-bottom: 0.35rem;
    }}
    .report-body h1:first-child {{
      margin-top: 0;
    }}
    .report-body h2 {{
      font-size: 1.22rem;
      margin: 1.4rem 0 0.55rem;
      page-break-after: avoid;
      break-after: avoid;
    }}
    .report-body h3 {{
      font-size: 1.05rem;
      margin: 1.15rem 0 0.45rem;
      page-break-after: avoid;
      break-after: avoid;
    }}
    .report-body h4 {{
      font-size: 1rem;
      margin: 1rem 0 0.35rem;
    }}
    p {{ margin: 0 0 0.75rem; }}
    ul, ol {{ margin: 0 0 0.85rem; padding-left: 1.25rem; }}
    li {{ margin: 0.2rem 0; }}
    strong {{ font-weight: 650; }}
    a {{ color: var(--accent); }}
    hr {{
      border: 0;
      border-top: 1px solid var(--rule);
      margin: 1.4rem 0;
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      margin: 0.75rem 0 1.1rem;
      font-family: "IBM Plex Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
      font-size: 0.82rem;
      line-height: 1.4;
      page-break-inside: auto;
    }}
    thead {{ display: table-header-group; }}
    tr {{ page-break-inside: avoid; }}
    th, td {{
      border: 1px solid var(--rule);
      padding: 0.38rem 0.5rem;
      text-align: left;
      vertical-align: top;
    }}
    th {{
      background: var(--surface);
      font-weight: 600;
      color: var(--ink);
    }}
    code {{
      font-family: "IBM Plex Mono", "SFMono-Regular", Consolas, Menlo, monospace;
      font-size: 0.86em;
      background: var(--code-bg);
      padding: 0.08em 0.28em;
      border-radius: 3px;
    }}
    pre {{
      background: var(--code-bg);
      border: 1px solid var(--rule);
      border-left: 3px solid var(--accent);
      padding: 0.75rem 0.9rem;
      overflow-x: auto;
      margin: 0.75rem 0 1.1rem;
      page-break-inside: avoid;
      font-size: 0.78rem;
      line-height: 1.45;
    }}
    pre code {{
      background: transparent;
      padding: 0;
      font-size: inherit;
    }}
    blockquote {{
      margin: 0.75rem 0 1rem;
      padding: 0.35rem 0 0.35rem 0.9rem;
      border-left: 3px solid var(--accent);
      color: var(--muted);
    }}
    @page {{
      size: Letter;
      margin: 0.85in 0.75in 1in 0.75in;
    }}
    @media print {{
      a {{ text-decoration: none; color: inherit; }}
      .title-page, .toc-page, .report-body {{
        max-width: none;
      }}
    }}
  </style>
</head>
<body>
  <div class="page">
    {title_page}
    <section class="toc-page" aria-label="Table of contents">
      <h2>Table of Contents</h2>
      <nav class="toc">{toc_html}</nav>
    </section>
    <main class="report-body">
      {body}
    </main>
  </div>
</body>
</html>
"""

OUT_HTML.write_text(doc, encoding="utf-8")
print(f"Wrote {OUT_HTML}")
