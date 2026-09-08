/**
 * Reusable field datasets: definition, rows, visualization, interpretation.
 * Not hard-coded to water speed; Cedar Hollow is the first consumer.
 */

export function createDataState() {
  return {
    datasets: {},
    activeId: null
  };
}

export function datasetSpecById(catalog, id) {
  return catalog.datasets.find((item) => item.id === id) || null;
}

function emptyDataset(id) {
  return {
    id,
    rows: [],
    xField: null,
    yField: null,
    graphReady: false,
    patternId: null,
    conclusionId: null,
    interpreted: false,
    revised: false,
    lastHint: ""
  };
}

export function ensureDataset(state, id) {
  if (!state.datasets[id]) state.datasets[id] = emptyDataset(id);
  return state.datasets[id];
}

export function setDatasetRows(state, id, rows) {
  const dataset = ensureDataset(state, id);
  dataset.rows = rows;
  state.activeId = id;
  return dataset;
}

export function setGraphAxes(state, catalog, datasetId, xField, yField) {
  const spec = datasetSpecById(catalog, datasetId);
  const dataset = ensureDataset(state, datasetId);
  dataset.xField = xField;
  dataset.yField = yField;
  const xOk = spec.graph.allowedX.includes(xField);
  const yOk = spec.graph.allowedY.includes(yField);
  dataset.graphReady = xOk && yOk;
  dataset.lastHint = dataset.graphReady
    ? ""
    : "Put the thing you changed along the bottom, and what you measured up the side.";
  return { ok: dataset.graphReady, hint: dataset.lastHint, dataset };
}

export function graphModel(state, catalog, datasetId) {
  const spec = datasetSpecById(catalog, datasetId);
  const dataset = state.datasets[datasetId];
  if (!spec || !dataset) return null;
  const x = dataset.xField || spec.graph.suggestedX;
  const y = dataset.yField || spec.graph.suggestedY;
  const points = [];
  const slopeOrder = ["gentle", "moderate", "steep"];
  for (const row of dataset.rows) {
    points.push({
      x: typeof row[x] === "number" ? row[x] : slopeOrder.indexOf(row.slope),
      y: row[y],
      label: row.slopeLabel || row.slope,
      seconds: row.seconds,
      speed: row.speed
    });
  }
  const grouped = {};
  for (const pt of points) {
    grouped[pt.x] = grouped[pt.x] || [];
    grouped[pt.x].push(pt.y);
  }
  const means = Object.entries(grouped)
    .map(([xVal, ys]) => ({
      x: Number(xVal),
      y: ys.reduce((sum, value) => sum + value, 0) / ys.length
    }))
    .sort((a, b) => a.x - b.x);
  return {
    title: spec.graph.title,
    xField: x,
    yField: y,
    xLabel: spec.columns.find((col) => col.id === x)?.label || x,
    yLabel: spec.columns.find((col) => col.id === y)?.label || y,
    ready: dataset.graphReady,
    points,
    means
  };
}

export function meansBySlope(rows) {
  const groups = {};
  for (const row of rows) {
    groups[row.slope] = groups[row.slope] || [];
    groups[row.slope].push(row);
  }
  return Object.entries(groups).map(([slope, list]) => {
    const seconds = list.reduce((sum, row) => sum + row.seconds, 0) / list.length;
    const speed = list.reduce((sum, row) => sum + row.speed, 0) / list.length;
    return {
      slope,
      label: list[0].slopeLabel || slope,
      seconds: Math.round(seconds * 10) / 10,
      speed: Math.round(speed * 100) / 100,
      n: list.length
    };
  });
}

export function tryInterpretation(state, catalog, datasetId, patternId, conclusionId) {
  const spec = datasetSpecById(catalog, datasetId);
  const dataset = ensureDataset(state, datasetId);
  const pattern = spec.patterns.find((item) => item.id === patternId);
  const conclusion = spec.conclusions.find((item) => item.id === conclusionId);
  dataset.patternId = patternId;
  dataset.conclusionId = conclusionId;
  if (!dataset.graphReady) {
    dataset.lastHint = "Set the graph first so the pattern has something to stand on.";
    return { ok: false, hint: dataset.lastHint };
  }
  if (pattern?.weak || conclusion?.weak || (pattern && !pattern.correct) || (conclusion && !conclusion.correct)) {
    dataset.revised = true;
    dataset.interpreted = false;
    dataset.lastHint = conclusion?.hint || pattern?.hint || "Look at the overall pattern, not one exact time.";
    return { ok: false, weak: Boolean(pattern?.weak || conclusion?.weak), hint: dataset.lastHint };
  }
  if (pattern?.correct && conclusion?.correct) {
    dataset.interpreted = true;
    dataset.lastHint = "The numbers agree with each other, even when they aren't identical.";
    return { ok: true, already: false, hint: dataset.lastHint };
  }
  dataset.lastHint = "Pick a pattern and a conclusion that the table actually supports.";
  return { ok: false, hint: dataset.lastHint };
}

export function drawDatasetGraph(ctx, width, height, model) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#efe6d2";
  ctx.fillRect(0, 0, width, height);
  const pad = { l: 42, r: 12, t: 18, b: 32 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  ctx.strokeStyle = "#8a7a5a";
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t);
  ctx.lineTo(pad.l, pad.t + innerH);
  ctx.lineTo(pad.l + innerW, pad.t + innerH);
  ctx.stroke();
  ctx.fillStyle = "#44553d";
  ctx.font = "11px Trebuchet MS, sans-serif";
  ctx.fillText(model.title || "Field graph", pad.l, 14);
  ctx.fillText(model.xLabel || "", pad.l + 8, height - 8);
  ctx.save();
  ctx.translate(12, pad.t + innerH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(model.yLabel || "", 0, 0);
  ctx.restore();
  if (!model.points.length) return;
  const ys = model.points.map((pt) => pt.y);
  const minY = Math.min(...ys) * 0.85;
  const maxY = Math.max(...ys) * 1.12;
  const span = maxY - minY || 1;
  const xs = model.points.map((pt) => pt.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const xSpan = maxX - minX || 1;
  const px = (value) => pad.l + ((value - minX) / xSpan) * innerW;
  const py = (value) => pad.t + innerH - ((value - minY) / span) * innerH;
  ctx.strokeStyle = "#2f6b3a";
  ctx.beginPath();
  (model.means || []).forEach((pt, i) => {
    if (i === 0) ctx.moveTo(px(pt.x), py(pt.y));
    else ctx.lineTo(px(pt.x), py(pt.y));
  });
  ctx.stroke();
  ctx.fillStyle = "#2f6b3a";
  for (const pt of model.points) {
    ctx.fillRect(px(pt.x) - 3, py(pt.y) - 3, 6, 6);
  }
}
