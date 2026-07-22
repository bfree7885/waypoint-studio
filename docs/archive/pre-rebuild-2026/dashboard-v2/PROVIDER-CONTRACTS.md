# Dashboard V2 — Provider Contracts

Normalized at `WDS.dashboardV2Model.normalizeFromContext(ctx)`.

## Location

```js
{
  label: string,          // never null/undefined/0,0
  source: string,
  sourceLabel: string,
  lat, lng: number|null,
  coordsOk: boolean,
  timezone: string|null
}
```

## Weather

```js
{
  live: boolean,
  current: { tempF, feelsF, humidity, windMph, cloudPct, uv, precipProb, conditions, ... },
  hourly: array,
  daily: array
}
```

## Alerts (official)

Each item: `event`, `headline`, `severity`, `effective`, `expires`, `area`, `summary`, `url`, `source: "NWS"`.

## Rivers

Each site: `name`, `distanceMi`, `stageFt`, `flowCfs`, `trend`, `observedAt`, `stale`, `source`.

## Provider meta

`hydratedAt`, `fromCache`, `connectivity`, `trust`, `blockStatus`.

## Briefing output

```js
{
  title, ready, partial, confidence,
  sections: { feel, changes, opportunities, caution, noticing },
  traces: [{ rule, text, data }]
}
```

Raw OIP responses must not be read directly by V2 renderers—only normalized model.
