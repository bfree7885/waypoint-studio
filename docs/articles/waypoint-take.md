# Waypoint’s Take — Official Editorial Component

**Module:** `design-system/js/platform/wds-take.js`  
**Styles:** `.wds-take` in `design-system/css/wds-aurora-bridge.css` + Articles card rules in `wds-articles-feed.css`  
**Surfaces:** Home deepeners, Dashboard, Articles cards, editorial samples

## What it is

Waypoint’s Take is the studio’s **official interpretation component**. It is editorial (or honestly empty) — not a score, not a summary restatement, not engagement copy.

## What it is not

| Not this | Instead |
|----------|---------|
| Summary / feed description | Separate **Summary** block (source facts) |
| Fabricated certainty | Restrained empty state when unknown |
| Product marketing | Optional related Waypoint action below Take |
| Duplicate of the headline | Explain **why it matters**, who may be affected, what to watch for |

## Rules

1. **Never repeat Summary.** If Take text equals or near-duplicates Summary, UI treats it as absent and shows the restrained empty state.
2. **Never invent Takes on live curated items** when provenance is `unavailable` or body is empty.
3. Label the component **“Waypoint’s Take”** exactly; mark provenance (`fallback` · `editor-written` · `generated` · `unavailable`).
4. Visually distinct: lime uppercase title, dark elevated surface, accent left
   bar, normal body type — Summary stays plain body type. Do **not** set Take
   body to full-paragraph italics (hurts scanability and perceived certainty).

## API

```js
WDS.take.mount(el, { body, meta, sources, surface, title, showTitle });
WDS.take.restrained(el, { reason, surface, meta });
WDS.take.renderArticleHtml({ body, summary, provenance, meta });
WDS.take.isRedundantWithSummary(take, summary);
WDS.take.homepageDefault();
```

Articles feed prefers `renderArticleHtml` so cards share one markup contract with CSS hooks:

- `.wds-take.wds-take--article`
- `.wds-take--restrained` when empty / unavailable / redundant
- legacy alias `.waf-card__take` retained for smoke tests

## Articles + Side Trails

Curated RSS may ship deterministic fallback Takes from the pipeline, or `unavailable`. Side Trails projects that publish articles later should supply editor-written Takes when they have one — otherwise omit / mark unavailable and let the component show the honest empty state.

See [reusable-articles-architecture.md](./reusable-articles-architecture.md).
