import { boot } from "./game.js?v=p79b";

boot().catch((err) => {
  const box = document.querySelector("#boot-error");
  if (box) {
    box.hidden = false;
    box.textContent = "TerrainBound could not load. Serve this folder over http (not a file:// URL).";
  }
  console.error(err);
});
