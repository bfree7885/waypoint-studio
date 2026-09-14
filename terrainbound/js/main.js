import { boot } from "./game.js?v=p8ds";
import { startFieldStation, shouldSkipFieldStation } from "./field-station.js";

const bootError = document.querySelector("#boot-error");

function fail(err) {
  if (bootError) {
    bootError.hidden = false;
    bootError.textContent = "TerrainBound could not load. Serve this folder over http (not a file:// URL).";
  }
  console.error(err);
}

if (shouldSkipFieldStation(location.search)) {
  document.querySelector("#field-station")?.setAttribute("hidden", "");
  const gameRoot = document.querySelector("#game-root");
  if (gameRoot) gameRoot.hidden = false;
  document.body.classList.add("is-field");
  boot().catch(fail);
} else {
  startFieldStation({ bootGame: (options) => boot(document, options) }).catch(fail);
}
