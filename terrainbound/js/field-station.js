/**
 * Field Station shell. Loads the learning spine, not the game engine.
 * Game boot is injected by main.js so this file never imports game.js.
 */

import { readSave } from "./save.js";
import {
  courseDisplayTopics,
  parseStationRoute,
  resumeLabel,
  shouldSkipFieldStation,
  stationHashFor,
  studentFacingTextHasLeak,
  studentTopicCard,
  watchReadItems
} from "./learning.js";

export { shouldSkipFieldStation, parseStationRoute, stationHashFor };

const DATA = {
  curriculum: new URL("../data/learning/curriculum.json", import.meta.url).href,
  concepts: new URL("../data/learning/concepts.json", import.meta.url).href,
  experiences: new URL("../data/learning/experiences.json", import.meta.url).href,
  catalog: new URL("../data/learning/catalog.json", import.meta.url).href
};

function escapeText(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function loadJson(url) {
  return fetch(url).then((res) => {
    if (!res.ok) throw new Error(`Could not load ${url}`);
    return res.json();
  });
}

export async function loadStationSpine() {
  const [curriculum, concepts, experiences, catalog] = await Promise.all([
    loadJson(DATA.curriculum),
    loadJson(DATA.concepts),
    loadJson(DATA.experiences),
    loadJson(DATA.catalog)
  ]);
  return { curriculum, concepts, experiences, catalog };
}

export function continueModel(storage = typeof localStorage === "undefined" ? null : localStorage) {
  const save = readSave(storage);
  if (!save) {
    return { hasSave: false, label: "Start field work", detail: "Cedar Hollow is the first walkable region." };
  }
  return {
    hasSave: true,
    label: "Continue field work",
    detail: `Resume ${resumeLabel(save)}.`
  };
}

function renderHome(state) {
  const cont = continueModel();
  return `
    <section class="station-hero" aria-labelledby="station-title">
      <p class="station-kicker">The Field Service</p>
      <h1 id="station-title">Field Station</h1>
      <p class="station-tag">An Earth &amp; Space Science camp before the trail. Walk the land when you are ready.</p>
      <aside class="station-summit" aria-label="Note from Summit">
        <img src="./assets/summit/summit-neutral.svg" width="48" height="48" alt="">
        <p>I walk the investigations with you. Out here I can point at the board. In the field I stay with the notes you actually took.</p>
      </aside>
    </section>
    <nav class="station-actions" aria-label="Field Station">
      ${cont.hasSave ? `<button type="button" class="station-btn station-btn-primary" data-go="continue">${escapeText(cont.label)}</button>` : ""}
      <button type="button" class="station-btn ${cont.hasSave ? "" : "station-btn-primary"}" data-go="field">${cont.hasSave ? "Field" : "Start field work"}</button>
      <button type="button" class="station-btn" data-go="course">Course atlas</button>
      <button type="button" class="station-btn" data-go="watch">Watch &amp; Read</button>
      <button type="button" class="station-btn" data-go="ask">Ask Summit</button>
    </nav>
    <p class="station-foot">${escapeText(cont.detail)}</p>
  `;
}

function renderCourse(state) {
  const topics = courseDisplayTopics(state.curriculum).map((topic) =>
    studentTopicCard(topic, {
      concepts: state.concepts.concepts,
      experiences: state.experiences.experiences,
      catalog: state.catalog
    })
  );
  const cards = topics
    .map(
      (topic) => `
      <li>
        <button type="button" class="station-topic" data-go="topic" data-topic-id="${escapeText(topic.id)}">
          <span class="station-topic-num">Topic ${topic.number}</span>
          <span class="station-topic-title">${escapeText(topic.title)}</span>
          <span class="station-status station-status-${topic.availability.id}">${escapeText(topic.availability.label)}</span>
        </button>
      </li>`
    )
    .join("");
  return `
    <header class="station-view-head">
      <button type="button" class="station-back" data-go="home">Back to Field Station</button>
      <h1>Course atlas</h1>
      <p>Twelve Earth &amp; Space Science topics. This is a field guide, not a checklist.</p>
    </header>
    <ol class="station-topic-list">${cards}</ol>
  `;
}

function renderTopic(state, topicId) {
  const topic = courseDisplayTopics(state.curriculum).find((row) => row.id === topicId);
  if (!topic) {
    return `<p class="station-empty">That topic is not on the atlas.</p><button type="button" class="station-back" data-go="course">Back to Course atlas</button>`;
  }
  const card = studentTopicCard(topic, {
    concepts: state.concepts.concepts,
    experiences: state.experiences.experiences,
    catalog: state.catalog
  });
  const concepts = card.conceptNames.length
    ? `<ul class="station-chips">${card.conceptNames.map((name) => `<li>${escapeText(name)}</li>`).join("")}</ul>`
    : `<p class="station-empty">Concept notes for this topic are still being gathered.</p>`;
  const fields = card.fieldExperiences.length
    ? card.fieldExperiences
        .map(
          (row) =>
            `<li><strong>${escapeText(row.label)}</strong> · ${row.status === "playable" ? "Walkable now" : "Not built yet"}</li>`
        )
        .join("")
    : "<li>No field region is attached yet.</li>";
  const resources = card.resources.length
    ? card.resources
        .map((row) => `<li><button type="button" class="station-link" data-go="resource" data-resource-id="${escapeText(row.id)}">${escapeText(row.title)}</button> · ${escapeText(row.typeLabel)}</li>`)
        .join("")
    : "<li>No Watch &amp; Read items are attached yet.</li>";
  const walk =
    card.availability.id === "available"
      ? `<button type="button" class="station-btn station-btn-primary" data-go="field">Walk the land</button>`
      : `<p class="station-empty">There is no playable field work for this topic yet. The atlas is honest about that.</p>`;
  return `
    <header class="station-view-head">
      <button type="button" class="station-back" data-go="course">Back to Course atlas</button>
      <p class="station-kicker">Topic ${card.number}</p>
      <h1>${escapeText(card.title)}</h1>
      <p>${escapeText(card.description)}</p>
      <p class="station-status station-status-${card.availability.id}">${escapeText(card.availability.label)}</p>
    </header>
    <section>
      <h2>What you learn to notice</h2>
      ${concepts}
    </section>
    <section>
      <h2>Field work</h2>
      <ul class="station-plain">${fields}</ul>
      ${walk}
    </section>
    <section>
      <h2>Watch &amp; Read</h2>
      <ul class="station-plain">${resources}</ul>
    </section>
  `;
}

function renderWatch(state) {
  const items = watchReadItems(state.catalog, state.concepts.concepts);
  const cards = items
    .map(
      (row) => `
      <li>
        <button type="button" class="station-topic" data-go="resource" data-resource-id="${escapeText(row.id)}">
          <span class="station-topic-num">${escapeText(row.typeLabel)}</span>
          <span class="station-topic-title">${escapeText(row.title)}</span>
          ${row.brand && row.typeLabel !== row.brand ? `<span class="station-brand">${escapeText(row.brand)}</span>` : ""}
        </button>
      </li>`
    )
    .join("");
  return `
    <header class="station-view-head">
      <button type="button" class="station-back" data-go="home">Back to Field Station</button>
      <h1>Watch &amp; Read</h1>
      <p>Only items already in the TerrainBound catalog. Deep Forest Dispatch is its own channel.</p>
    </header>
    <ul class="station-topic-list">${cards || `<li class="station-empty">No resources are catalogued yet.</li>`}</ul>
  `;
}

function renderResource(state, resourceId) {
  const items = watchReadItems(state.catalog, state.concepts.concepts);
  const row = items.find((item) => item.id === resourceId);
  if (!row) {
    return `<p class="station-empty">That resource is not in the catalog.</p><button type="button" class="station-back" data-go="watch">Back to Watch &amp; Read</button>`;
  }
  let body = "";
  if (row.youtubeVideoId && row.embedPolicy === "youtube-embed-only") {
    body = `
      <p class="station-brand-lead">${escapeText(row.brand || "Educational video")} · YouTube embed. TerrainBound does not host this film.</p>
      <div class="station-embed">
        <iframe
          title="${escapeText(row.title)}"
          src="https://www.youtube-nocookie.com/embed/${escapeText(row.youtubeVideoId)}"
          allow="fullscreen; picture-in-picture"
          allowfullscreen
          loading="lazy"
          referrerpolicy="strict-origin-when-cross-origin"></iframe>
      </div>
      ${row.youtubeUrl ? `<p><a href="${escapeText(row.youtubeUrl)}" rel="noopener noreferrer" target="_blank">Open on YouTube</a></p>` : ""}
    `;
  } else if (row.fieldOnly) {
    body = `
      <p>This lives in the field, not as a separate worksheet. Walk the land when you want to take it up.</p>
      <button type="button" class="station-btn station-btn-primary" data-go="field">Open Field</button>
    `;
  } else {
    body = `<p class="station-empty">This item is catalogued for later. Nothing extra was invented to fill the page.</p>`;
  }
  const concepts = row.conceptNames.length
    ? `<ul class="station-chips">${row.conceptNames.map((name) => `<li>${escapeText(name)}</li>`).join("")}</ul>`
    : "";
  return `
    <header class="station-view-head">
      <button type="button" class="station-back" data-go="watch">Back to Watch &amp; Read</button>
      <p class="station-kicker">${escapeText(row.typeLabel)}</p>
      <h1>${escapeText(row.title)}</h1>
    </header>
    ${body}
    ${concepts}
  `;
}

function renderAsk() {
  return `
    <header class="station-view-head">
      <button type="button" class="station-back" data-go="home">Back to Field Station</button>
      <h1>Ask Summit</h1>
    </header>
    <aside class="station-summit" aria-label="Summit is not a global tutor yet">
      <img src="./assets/summit/summit-neutral.svg" width="48" height="48" alt="">
      <p>Summit currently tutors inside supported field investigations — Cedar Hollow and Dark Sky Basin. There is no separate Station tutor yet, on purpose: I should not answer without the notes in front of us.</p>
    </aside>
    <p class="station-empty">A global Ask Summit desk comes later. This is not a second bot, and it will not guess about a region you are not standing in.</p>
    <button type="button" class="station-btn station-btn-primary" data-go="field">Find Summit in the field</button>
  `;
}

function renderView(state, route) {
  if (route.view === "course") return renderCourse(state);
  if (route.view === "topic") return renderTopic(state, route.topicId);
  if (route.view === "watch") return renderWatch(state);
  if (route.view === "resource") return renderResource(state, route.resourceId);
  if (route.view === "ask") return renderAsk();
  return renderHome(state);
}

export function renderStationView(state, route) {
  return renderView(state, route);
}

export function paintStation(root, state, route) {
  const view = root.querySelector("#station-view");
  if (!view) return;
  view.innerHTML = renderView(state, route);
  const visible = String(view.innerHTML || "").replace(/<[^>]+>/g, " ");
  if (studentFacingTextHasLeak(visible)) view.dataset.leak = "standards";
  else if (view.dataset) delete view.dataset.leak;
}

export async function startFieldStation({
  bootGame,
  storage = window.localStorage,
  locationRef = window.location
} = {}) {
  const station = document.querySelector("#field-station");
  const gameRoot = document.querySelector("#game-root");
  const view = document.querySelector("#station-view");
  if (!station || !view) throw new Error("Field Station markup is missing");

  const state = await loadStationSpine();
  let gameApi = null;
  let booting = null;
  let lastStationHash = "#/";
  let skipTitleOnce = false;

  function showStation() {
    document.body.classList.add("is-station");
    document.body.classList.remove("is-field");
    station.hidden = false;
    if (gameRoot) gameRoot.hidden = true;
  }

  function showField() {
    document.body.classList.add("is-field");
    document.body.classList.remove("is-station");
    station.hidden = true;
    if (gameRoot) gameRoot.hidden = false;
  }

  async function ensureGame(options) {
    if (gameApi) return gameApi;
    if (!bootGame) throw new Error("Field Station needs the existing game boot");
    if (!booting) {
      booting = bootGame({
        deferTitle: true,
        enableReturn: true,
        onLeave: () => {
          const next = lastStationHash || "#/";
          if (locationRef.hash !== next) locationRef.hash = next;
          showStation();
          paintStation(station, state, parseStationRoute(next));
        }
      });
    }
    gameApi = await booting;
    return gameApi;
  }

  async function enterField({ skipTitle } = {}) {
    showField();
    const api = await ensureGame();
    api.enterField({ skipTitle: Boolean(skipTitle) });
    window.dispatchEvent(new Event("resize"));
  }

  function applyRoute() {
    const route = parseStationRoute(locationRef.hash);
    if (route.view === "field") {
      const skipTitle = skipTitleOnce;
      skipTitleOnce = false;
      enterField({ skipTitle }).catch((err) => console.error(err));
      return;
    }
    if (gameApi) gameApi.leaveField();
    showStation();
    lastStationHash = stationHashFor(route);
    paintStation(station, state, route);
  }

  station.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-go]");
    if (!btn) return;
    const go = btn.getAttribute("data-go");
    if (go === "continue") {
      lastStationHash = "#/";
      skipTitleOnce = true;
      locationRef.hash = "#/field";
      return;
    }
    if (go === "field") {
      lastStationHash = stationHashFor(parseStationRoute(locationRef.hash));
      if (lastStationHash === "#/field") lastStationHash = "#/";
      skipTitleOnce = false;
      locationRef.hash = "#/field";
      return;
    }
    if (go === "home") locationRef.hash = "#/";
    if (go === "course") locationRef.hash = "#/course";
    if (go === "watch") locationRef.hash = "#/watch";
    if (go === "ask") locationRef.hash = "#/ask";
    if (go === "topic") locationRef.hash = stationHashFor({ view: "topic", topicId: btn.getAttribute("data-topic-id") });
    if (go === "resource") locationRef.hash = stationHashFor({ view: "resource", resourceId: btn.getAttribute("data-resource-id") });
  });

  window.addEventListener("hashchange", applyRoute);
  showStation();
  if (!locationRef.hash) locationRef.hash = "#/";
  applyRoute();
  return { state, enterField, continueModel: () => continueModel(storage) };
}
