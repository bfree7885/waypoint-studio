import { createWorld, moveWithCollision, nearestInspectable, nearestStoryProp, nearRanger, heightAt, inCreek, onTrail } from "./world.js";
import {
  createMissionState,
  addObservation,
  addStoryNote,
  canPresentFindings,
  tryAddPathNode,
  resetPath,
  observedFeatureIds
} from "./mission.js";
import {
  createDiscoveryState,
  addDiscovery,
  nearestDiscovery,
  discoveryLogModel,
  pickWrenLines,
  isFound
} from "./discoveries.js";
import {
  createInvestigationState,
  beginInvestigation,
  shouldIntroduceInvestigation,
  syncPassiveEvidence,
  recordMeasurement,
  availableMeasurementAt,
  blockedMeasurementAt,
  canProposeExplanation,
  evidenceModel,
  sketchModel,
  evaluateHypothesis,
  setSelectedProcess,
  toggleSelectedEvidence,
  clearHypothesisDraft,
  pickLandscapeWren,
  interpretiveLabels
} from "./investigation.js";
import { createRenderer } from "./render.js";
import { bindUi } from "./ui.js";

const WALK_SPEED = 210;
const VIEW_HEIGHT = 760;

const FLOW_MAP = [
  { id: "westface-slope", short: "Slope", mapX: 22, mapY: 28 },
  { id: "pine-creek", short: "Creek", mapX: 42, mapY: 44 },
  { id: "mirror-pond", short: "Pond", mapX: 48, mapY: 64 },
  { id: "willow-reach", short: "Reach", mapX: 58, mapY: 84 },
  { id: "high-look", short: "Look", mapX: 68, mapY: 18 },
  { id: "willow-bench", short: "Bench", mapX: 62, mapY: 72 }
];

export async function boot(root = document) {
  const canvas = root.querySelector("#world");
  const [region, mission, curriculum, catalog, investigation] = await Promise.all([
    fetch("./data/regions/cedar-hollow.json").then((r) => r.json()),
    fetch("./data/missions/where-does-the-water-go.json").then((r) => r.json()),
    fetch("./data/curriculum/placeholders.json").then((r) => r.json()),
    fetch("./data/discoveries/cedar-hollow.json").then((r) => r.json()),
    fetch("./data/investigations/reading-the-landscape.json").then((r) => r.json())
  ]);
  void curriculum;

  const world = createWorld(region, 1842, catalog.items);
  const missionState = createMissionState(mission);
  const discoveryState = createDiscoveryState();
  const invState = createInvestigationState();
  const ui = bindUi(root);
  const renderer = createRenderer(canvas, world, { heightAt, inCreek, onTrail });
  const keys = new Set();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const player = {
    x: region.spawn.x,
    y: region.spawn.y,
    vx: 0,
    vy: 0,
    facing: -1
  };

  const camera = { x: player.x, y: player.y - 40, scale: 1 };
  let destination = null;
  let mode = "title";
  let journalOpen = false;
  let dialogue = null;
  let conclusionOpen = false;
  let hypothesisOpen = false;
  let last = performance.now();
  let inspectLock = false;

  function journalView(open = journalOpen) {
    const evidence = evidenceModel(investigation, invState);
    return {
      open,
      observations: missionState.observations,
      storyNotes: missionState.storyNotes,
      concluded: missionState.concluded,
      conclusionText: mission.completeJournalEntry,
      discoveryLog: discoveryLogModel(catalog, discoveryState),
      landscapeActive: invState.active,
      landscapeConcluded: invState.concluded,
      landscapeConclusionText: investigation.completeJournalEntry,
      evidence,
      sketch: sketchModel(investigation, invState),
      investigation,
      canPropose: canProposeExplanation(investigation, invState)
    };
  }

  function refreshJournal() {
    ui.setJournal(journalView());
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
    camera.scale = canvas.height / VIEW_HEIGHT;
  }

  function screenToWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    return {
      x: (x - canvas.width / 2) / camera.scale + camera.x,
      y: (y - canvas.height / 2) / camera.scale + camera.y
    };
  }

  function openIntro() {
    missionState.introSeen = true;
    showDialogueLines(mission.intro.speaker, mission.intro.lines, 0, () => {
      dialogue = null;
      ui.showDialogue(false);
      ui.setHint("WASD or click to walk · E inspect · J field tablet");
    });
  }

  function showDialogueLines(speaker, lines, index, onDone, kicker = "") {
    const line = lines[index];
    const lastLine = index >= lines.length - 1;
    dialogue = { speaker, lines, index };
    ui.showDialogue(
      true,
      speaker,
      line,
      [
        {
          label: lastLine ? (speaker === "Ranger Wren" ? "Let's go" : "Got it") : "Continue",
          onClick: () => {
            if (lastLine) onDone();
            else showDialogueLines(speaker, lines, index + 1, onDone, kicker);
          }
        }
      ],
      kicker
    );
  }

  function inspectFeature(feature) {
    if (!feature || inspectLock) return;
    const result = addObservation(missionState, mission, feature.id);
    if (!result) return;
    inspectLock = true;
    const spec = result.spec;
    showDialogueLines("Field note", [spec.prompt, spec.text], 0, () => {
      dialogue = null;
      ui.showDialogue(false);
      inspectLock = false;
      if (!result.already) {
        ui.showToast("Observation added", spec.text);
        refreshJournal();
      }
    });
  }

  function inspectDiscovery(item) {
    if (!item || inspectLock) return;
    inspectLock = true;

    if (!isFound(discoveryState, item.id)) {
      const result = addDiscovery(discoveryState, catalog, item.id);
      showDialogueLines(item.name, [item.prompt, item.text], 0, () => {
        dialogue = null;
        ui.showDialogue(false);
        inspectLock = false;
        if (!result.already) {
          syncPassiveEvidence(invState, investigation, discoveryState);
          ui.showToast("Discovery", item.name);
          refreshJournal();
        }
      }, "Discovery");
      return;
    }

    const pending = availableMeasurementAt(investigation, invState, discoveryState, item.id);
    if (pending) {
      showDialogueLines("Field measurement", [pending.prompt, pending.result], 0, () => {
        const recorded = recordMeasurement(invState, investigation, pending.id, discoveryState);
        dialogue = null;
        ui.showDialogue(false);
        inspectLock = false;
        if (!recorded.already) {
          ui.showToast("Measurement", pending.result);
          refreshJournal();
        }
      }, pending.actionLabel);
      return;
    }

    const blocked = blockedMeasurementAt(investigation, invState, discoveryState, item.id);
    if (blocked) {
      showDialogueLines(item.name, [item.text, blocked.missingHint], 0, () => {
        dialogue = null;
        ui.showDialogue(false);
        inspectLock = false;
      });
      return;
    }

    showDialogueLines(item.name, [item.text], 0, () => {
      dialogue = null;
      ui.showDialogue(false);
      inspectLock = false;
    });
  }

  function inspectProp(prop) {
    if (!prop?.inspect || inspectLock) return;
    const result = addStoryNote(missionState, prop.inspect);
    inspectLock = true;
    showDialogueLines(prop.inspect.title, [prop.inspect.text], 0, () => {
      dialogue = null;
      ui.showDialogue(false);
      inspectLock = false;
      if (!result.already) {
        ui.showToast("Field note", prop.inspect.title);
        refreshJournal();
      }
    });
  }

  function currentTarget() {
    const disc = nearestDiscovery(catalog, player.x, player.y);
    const feat = nearestInspectable(world, player.x, player.y, 90);
    const prop = nearestStoryProp(region, player.x, player.y);
    const rangerNear = nearRanger(region, player.x, player.y);
    const rangerD = Math.hypot(player.x - region.ranger.x, player.y - region.ranger.y);
    const options = [];
    if (disc) options.push({ kind: "discovery", item: disc, x: disc.x, y: disc.y, d: Math.hypot(player.x - disc.x, player.y - disc.y), name: disc.name });
    if (feat) options.push({ kind: "feature", item: feat, x: feat.x, y: feat.y, d: Math.hypot(player.x - feat.x, player.y - feat.y), name: feat.name });
    if (prop) options.push({ kind: "prop", item: prop, x: prop.x, y: prop.y, d: Math.hypot(player.x - prop.x, player.y - prop.y), name: prop.inspect.title });
    options.sort((a, b) => a.d - b.d);
    const closest = options[0] || null;
    if (rangerNear && (!closest || rangerD <= closest.d + 8)) {
      return { kind: "wren", x: region.ranger.x, y: region.ranger.y, name: "Ranger Wren" };
    }
    return closest;
  }

  function inspectTarget(target) {
    if (!target) return;
    if (target.kind === "wren") talkToWren();
    else if (target.kind === "discovery") inspectDiscovery(target.item);
    else if (target.kind === "prop") inspectProp(target.item);
    else inspectFeature(target.item);
  }

  function talkToWren() {
    const ready = canPresentFindings(missionState, mission);
    const done = missionState.concluded;
    if (ready && !done) {
      ui.showDialogue(true, "Ranger Wren", "You've got mud on your boots and notes in the tablet. Trace the water with me.", [
        {
          label: "Trace the path",
          onClick: () => {
            dialogue = null;
            ui.showDialogue(false);
            openConclusion();
          }
        },
        {
          label: "Not yet",
          onClick: () => {
            dialogue = null;
            ui.showDialogue(false);
          }
        }
      ]);
      return;
    }
    const pendingAck = discoveryState.foundIds.find(
      (id) => !discoveryState.acknowledgedIds.includes(id)
    );
    if (pendingAck) {
      const lines = pickWrenLines(catalog, discoveryState, ready, done);
      showDialogueLines("Ranger Wren", lines, 0, () => {
        dialogue = null;
        ui.showDialogue(false);
      });
      return;
    }
    if (shouldIntroduceInvestigation(invState, discoveryState, done)) {
      showDialogueLines("Ranger Wren", investigation.intro.lines, 0, () => {
        beginInvestigation(invState, investigation, discoveryState);
        dialogue = null;
        ui.showDialogue(false);
        refreshJournal();
      });
      return;
    }
    if (canProposeExplanation(investigation, invState)) {
      ui.showDialogue(true, "Ranger Wren", investigation.wren.ready[0], [
        {
          label: "Build an explanation",
          onClick: () => {
            dialogue = null;
            ui.showDialogue(false);
            openHypothesis();
          }
        },
        {
          label: "Not yet",
          onClick: () => {
            dialogue = null;
            ui.showDialogue(false);
          }
        }
      ]);
      return;
    }
    if (invState.concluded) {
      showDialogueLines("Ranger Wren", investigation.wren.afterSuccess, 0, () => {
        dialogue = null;
        ui.showDialogue(false);
      });
      return;
    }
    if (invState.active) {
      const lines = pickLandscapeWren(investigation, invState, discoveryState);
      showDialogueLines("Ranger Wren", lines, 0, () => {
        dialogue = null;
        ui.showDialogue(false);
      });
      return;
    }
    const lines = pickWrenLines(catalog, discoveryState, ready, done);
    showDialogueLines("Ranger Wren", lines, 0, () => {
      dialogue = null;
      ui.showDialogue(false);
    });
  }

  function hypothesisView() {
    const evidence = evidenceModel(investigation, invState);
    const labels = Object.fromEntries(investigation.timescales.map((item) => [item.id, item.label]));
    return {
      processes: investigation.processes,
      evidenceCards: evidence.cards.map((card) => ({
        ...card,
        timescaleLabel: labels[card.timescale]
      })),
      selectedProcess: invState.selectedProcess,
      selectedEvidenceIds: invState.selectedEvidenceIds,
      status: invState.lastHint,
      concluded: invState.concluded
    };
  }

  function renderHypothesis() {
    ui.showHypothesis(true, hypothesisView(), {
      onProcess(id) {
        setSelectedProcess(invState, id);
        renderHypothesis();
      },
      onEvidence(id) {
        toggleSelectedEvidence(invState, id);
        renderHypothesis();
      }
    });
  }

  function openHypothesis() {
    if (!canProposeExplanation(investigation, invState) && !invState.concluded) {
      ui.showToast("Keep looking", "Compare the boulder, the grooves, and the shape of the valley first.");
      return;
    }
    hypothesisOpen = true;
    journalOpen = false;
    refreshJournal();
    renderHypothesis();
  }

  function closeHypothesis() {
    hypothesisOpen = false;
    ui.showHypothesis(false, {});
  }

  function tryHypothesis() {
    const result = evaluateHypothesis(
      investigation,
      invState,
      invState.selectedProcess,
      invState.selectedEvidenceIds
    );
    renderHypothesis();
    if (result.ok && !result.already) {
      journalOpen = true;
      refreshJournal();
      closeHypothesis();
      showDialogueLines("Ranger Wren", [investigation.hypothesis.success], 0, () => {
        dialogue = null;
        ui.showDialogue(false);
      });
    }
  }

  function openConclusion() {
    if (!canPresentFindings(missionState, mission) && !missionState.concluded) {
      ui.showToast("Keep exploring", mission.conclusion.incompleteHint);
      return;
    }
    conclusionOpen = true;
    renderConclusion(mission.conclusion.prompt);
  }

  function renderConclusion(hint) {
    ui.showConclusion(
      true,
      FLOW_MAP,
      missionState.conclusionPath,
      observedFeatureIds(missionState),
      hint
    );
  }

  function enterWorld() {
    mode = "play";
    ui.showTitle(false);
    canvas.focus();
    if (!missionState.introSeen) openIntro();
  }

  root.querySelector("#enter-btn").addEventListener("click", enterWorld);

  window.addEventListener("keydown", (event) => {
    if (event.key === "Tab") return;
    if (mode === "title" && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      enterWorld();
      return;
    }
    if (dialogue) {
      if (event.key === "Enter" || event.key === " " || event.key === "e" || event.key === "E") {
        event.preventDefault();
        const btn = root.querySelector("#dialogue-actions button");
        btn?.click();
      }
      return;
    }
    if (conclusionOpen) {
      if (event.key === "Escape") {
        conclusionOpen = false;
        ui.showConclusion(false, [], [], new Set(), "");
      }
      return;
    }
    if (hypothesisOpen) {
      if (event.key === "Escape") closeHypothesis();
      return;
    }
    keys.add(event.key.toLowerCase());
    if (event.key === "j" || event.key === "J") {
      journalOpen = !journalOpen;
      refreshJournal();
    }
    if (event.key === "e" || event.key === "E") {
      inspectTarget(currentTarget());
    }
    if (event.key === "Escape") {
      journalOpen = false;
      refreshJournal();
    }
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.key.toLowerCase());
  });

  canvas.addEventListener("pointerdown", (event) => {
    if (mode !== "play" || dialogue || conclusionOpen || hypothesisOpen) return;
    const worldPt = screenToWorld(event.clientX, event.clientY);
    const target = currentTarget();
    if (target && Math.hypot(worldPt.x - target.x, worldPt.y - target.y) < 70 && Math.hypot(player.x - target.x, player.y - target.y) < 100) {
      inspectTarget(target);
      return;
    }
    destination = worldPt;
  });

  root.querySelector("#journal-toggle").addEventListener("click", () => {
    journalOpen = !journalOpen;
    refreshJournal();
  });
  root.querySelector("#journal-close").addEventListener("click", () => {
    journalOpen = false;
    refreshJournal();
  });
  root.querySelector("#conclusion-close").addEventListener("click", () => {
    conclusionOpen = false;
    ui.showConclusion(false, [], [], new Set(), "");
  });
  root.querySelector("#hypothesis-close").addEventListener("click", closeHypothesis);
  root.querySelector("#hypothesis-clear").addEventListener("click", () => {
    clearHypothesisDraft(invState);
    renderHypothesis();
  });
  root.querySelector("#hypothesis-try").addEventListener("click", tryHypothesis);
  root.querySelector("#hypothesis-open").addEventListener("click", () => {
    openHypothesis();
  });
  root.querySelector("#path-reset").addEventListener("click", () => {
    resetPath(missionState);
    renderConclusion("Start again from the highest water you saw.");
  });
  root.querySelector("#flow-nodes").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-feature-id]");
    if (!btn) return;
    const result = tryAddPathNode(missionState, mission, btn.dataset.featureId);
    if (result.ok && result.complete) {
      ui.showToast("The path is clear", mission.conclusion.successText);
      journalOpen = true;
      refreshJournal();
      conclusionOpen = false;
      ui.showConclusion(false, [], [], new Set(), "");
      showDialogueLines("Ranger Wren", [mission.conclusion.successText], 0, () => {
        dialogue = null;
        ui.showDialogue(false);
      });
      return;
    }
    renderConclusion(result.ok ? mission.conclusion.prompt : result.hint);
  });

  ui.showTitle(true);
  ui.setJournal(journalView(false));
  ui.setHint("Enter Cedar Hollow to begin");
  resize();
  window.addEventListener("resize", resize);

  function step(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const playing = mode === "play" && !dialogue && !conclusionOpen && !hypothesisOpen;
    let ax = 0;
    let ay = 0;
    if (playing) {
      if (keys.has("w") || keys.has("arrowup")) ay -= 1;
      if (keys.has("s") || keys.has("arrowdown")) ay += 1;
      if (keys.has("a") || keys.has("arrowleft")) ax -= 1;
      if (keys.has("d") || keys.has("arrowright")) ax += 1;
      if (ax || ay) destination = null;
      if (!ax && !ay && destination) {
        const dx = destination.x - player.x;
        const dy = destination.y - player.y;
        if (Math.hypot(dx, dy) < 12) destination = null;
        else {
          ax = dx;
          ay = dy;
        }
      }
      const len = Math.hypot(ax, ay) || 1;
      const nx = (ax / len) * WALK_SPEED * dt;
      const ny = (ay / len) * WALK_SPEED * dt;
      const moved = moveWithCollision(world, player.x, player.y, nx, ny);
      player.vx = (moved.x - player.x) / dt;
      player.vy = (moved.y - player.y) / dt;
      player.x = moved.x;
      player.y = moved.y;
      if (ax) player.facing = ax >= 0 ? 1 : -1;
    } else {
      player.vx = 0;
      player.vy = 0;
    }

    if (mode === "title") {
      const t = now / 1000;
      camera.x = 1100 + Math.sin(t * 0.18) * 220;
      camera.y = 720 + Math.cos(t * 0.14) * 160;
    } else {
      camera.x += (player.x + player.facing * 24 - camera.x) * 0.08;
      camera.y += (player.y - 18 - camera.y) * 0.08;
    }

    const target = currentTarget();
    if (mode === "play" && !dialogue && !conclusionOpen && !hypothesisOpen) {
      if (!target) ui.setPrompt("");
      else if (target.kind === "wren") {
        ui.setPrompt(
          invState.concluded
            ? "Talk to Wren · E"
            : canProposeExplanation(investigation, invState)
              ? "Share what shaped the hollow · E"
              : missionState.concluded
                ? "Talk to Wren · E"
                : canPresentFindings(missionState, mission)
                  ? "Tell Wren what you found · E"
                  : "Talk to Wren · E"
        );
      } else if (target.kind === "discovery") {
        const pending = availableMeasurementAt(investigation, invState, discoveryState, target.item.id);
        ui.setPrompt(pending ? `${pending.actionLabel} · E` : "Look closer · E");
      } else {
        ui.setPrompt(`Inspect ${target.name} · E`);
      }
    } else if (!dialogue) {
      ui.setPrompt("");
    }

    renderer.draw({
      camera,
      player,
      time: now / 1000,
      reducedMotion,
      destination,
      observations: missionState.observations,
      flowVisible: missionState.flowVisible,
      landscapeInterpreted: invState.interpreted,
      measuredIds: invState.measuredIds,
      iceFlow: investigation.iceFlow,
      discoveries: catalog.items,
      nearTarget: target && target.kind !== "wren" ? target : null,
      interpretiveLabels: interpretiveLabels(
        investigation,
        invState,
        catalog,
        region,
        player
      )
    });
    requestAnimationFrame(step);
  }

  requestAnimationFrame(step);

  if (new URLSearchParams(location.search).get("field") === "1") {
    window.TB = {
      player,
      missionState,
      discoveryState,
      invState,
      catalog,
      investigation,
      region,
      go(x, y) {
        player.x = x;
        player.y = y;
        destination = null;
      },
      inspectDiscovery(id) {
        const item = catalog.items.find((entry) => entry.id === id);
        if (!item) return false;
        player.x = item.x;
        player.y = item.y;
        inspectDiscovery(item);
        return true;
      },
      inspectFeature(id) {
        const feature = region.features.find((entry) => entry.id === id);
        if (!feature) return false;
        player.x = feature.x;
        player.y = feature.y;
        inspectFeature(feature);
        return true;
      },
      talk() {
        player.x = region.ranger.x;
        player.y = region.ranger.y;
        talkToWren();
      },
      openJournal() {
        journalOpen = true;
        refreshJournal();
      },
      openHyp() {
        openHypothesis();
      },
      tryHyp() {
        tryHypothesis();
      }
    };
  }
}
