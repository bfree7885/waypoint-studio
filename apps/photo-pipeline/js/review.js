/**
 * Waypoint Photo Pipeline — local review UI
 * Loads review-queue.json; stores decisions in localStorage for CLI sync.
 */
(function () {
  const DECISIONS_KEY = "waypoint-photo-pipeline-decisions-v1";

  const state = {
    bundle: null,
    filtered: [],
    index: 0,
    decisions: loadDecisions(),
  };

  const $ = (id) => document.getElementById(id);

  function loadDecisions() {
    try {
      return JSON.parse(localStorage.getItem(DECISIONS_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveDecisions() {
    localStorage.setItem(DECISIONS_KEY, JSON.stringify(state.decisions));
  }

  async function tryAutoLoad() {
    const candidates = [
      "./data/review-queue.json",
      "/data/media/review-queue.json",
    ];
    for (const url of candidates) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) {
          applyBundle(await res.json());
          return;
        }
      } catch {
        /* file protocol / missing */
      }
    }
  }

  function applyBundle(bundle) {
    state.bundle = bundle;
    $("empty").hidden = true;
    $("detail").hidden = false;
    applyFilter();
    renderList();
    showCurrent();
    updateStats();
  }

  function effectiveStatus(asset) {
    const d = state.decisions[asset.id];
    return (d && d.decision) || asset.status || "queued";
  }

  function applyFilter() {
    if (!state.bundle) return;
    const q = ($("search").value || "").trim().toLowerCase();
    const filter = $("filter").value;
    state.filtered = state.bundle.assets.filter((a) => {
      const status = effectiveStatus(a);
      const privacy = (a.privacy && a.privacy.verdict) || "";
      if (filter === "pending" && !["needs_review", "analyzed", "queued"].includes(status)) return false;
      if (filter === "approved" && status !== "approved") return false;
      if (filter === "rejected" && status !== "rejected") return false;
      if (filter === "needs_editing" && status !== "needs_editing") return false;
      if (filter === "hidden" && status !== "hidden") return false;
      if (filter === "safe" && privacy !== "Safe") return false;
      if (filter === "privacy" && privacy === "Safe") return false;
      if (!q) return true;
      const hay = [
        a.source_name,
        a.id,
        a.accessibility && a.accessibility.caption,
        a.accessibility && a.accessibility.alt_text,
        ((a.accessibility && a.accessibility.keywords) || []).join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
    if (state.index >= state.filtered.length) state.index = 0;
  }

  function renderList() {
    const ul = $("queue");
    ul.innerHTML = "";
    state.filtered.forEach((a, i) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.innerHTML =
        '<span class="name"></span><span class="sub"></span>';
      btn.querySelector(".name").textContent = a.source_name || a.id;
      btn.querySelector(".sub").textContent =
        effectiveStatus(a) +
        " · " +
        ((a.privacy && a.privacy.verdict) || "—");
      if (i === state.index) btn.setAttribute("aria-current", "true");
      btn.addEventListener("click", () => {
        state.index = i;
        renderList();
        showCurrent();
      });
      li.appendChild(btn);
      ul.appendChild(li);
    });
  }

  function showCurrent() {
    const a = state.filtered[state.index];
    if (!a) {
      $("detail").hidden = true;
      $("empty").hidden = false;
      $("empty").querySelector("p").textContent = "No items match this filter.";
      return;
    }
    $("detail").hidden = false;
    $("empty").hidden = true;
    $("title").textContent = a.source_name || a.id;
    $("status-line").textContent =
      "Status: " +
      effectiveStatus(a) +
      " · Privacy: " +
      ((a.privacy && a.privacy.verdict) || "n/a");

    const img = $("preview");
    const src = a.preview || a.thumbnail || "";
    img.alt = (a.accessibility && a.accessibility.alt_text) || a.source_name || "";
    if (src) {
      // file paths may be absolute; browsers can't load arbitrary disk paths —
      // show placeholder note when not http(s) or relative under server
      if (/^https?:/i.test(src) || src.startsWith("/") || src.startsWith(".")) {
        img.src = src;
      } else if (src.startsWith("file:")) {
        img.removeAttribute("src");
        img.alt = "Preview path is local-only: open via review server or copy into apps/photo-pipeline/data/";
      } else {
        // Attempt file URL for local review server that maps library versions
        img.src = "file://" + src;
        img.onerror = () => {
          img.removeAttribute("src");
          img.alt = "Preview unavailable in browser (path: " + src + ")";
        };
      }
    } else {
      img.removeAttribute("src");
      img.alt = "No derivative preview yet — run process queue.";
    }

    $("alt").value = (a.accessibility && a.accessibility.alt_text) || "";
    $("caption").value = (a.accessibility && a.accessibility.caption) || "";

    const priv = $("privacy");
    priv.innerHTML = "";
    const flags = (a.privacy && a.privacy.flags) || [];
    if (!flags.length) {
      priv.textContent = "No privacy flags · suggested Safe";
    } else {
      flags.forEach((f) => {
        const div = document.createElement("div");
        div.className = "flag";
        div.dataset.sev = f.severity || "medium";
        div.innerHTML = "<strong></strong><span></span>";
        div.querySelector("strong").textContent = f.label;
        div.querySelector("span").textContent = f.detail || "";
        priv.appendChild(div);
      });
    }

    const scores = $("scores");
    scores.innerHTML = "";
    const sc = a.scores || {};
    Object.keys(sc).forEach((key) => {
      if (key === "method") return;
      const row = sc[key];
      if (!row || typeof row !== "object") return;
      const div = document.createElement("div");
      div.className = "score-row";
      div.innerHTML = "<span></span><span></span>";
      div.children[0].textContent = key.replace(/_/g, " ");
      div.children[1].textContent =
        (row.score != null ? Number(row.score).toFixed(2) : "—") +
        " — " +
        (row.explanation || "");
      scores.appendChild(div);
    });

    const classify = $("classify");
    classify.innerHTML = "";
    ((a.classification && a.classification.destinations) || a.destinations || [])
      .slice(0, 8)
      .forEach((d) => {
        const div = document.createElement("div");
        div.className = "dest-row";
        div.innerHTML = "<span></span><span></span>";
        div.children[0].textContent = d.destination || d;
        div.children[1].textContent =
          d.confidence != null
            ? Number(d.confidence).toFixed(2) + " — " + (d.explanation || "")
            : "";
        classify.appendChild(div);
      });

    $("metadata").textContent = JSON.stringify(a.metadata || {}, null, 2);
    $("analysis").textContent = JSON.stringify(
      {
        technical: (a.analysis && a.analysis.technical) || {},
        composition: (a.analysis && a.analysis.composition) || {},
        content: (a.analysis && a.analysis.content) || {},
        notes: (a.analysis && a.analysis.notes) || [],
      },
      null,
      2
    );
    updateStats();
  }

  function decide(decision) {
    const a = state.filtered[state.index];
    if (!a) return;
    state.decisions[a.id] = {
      decision,
      at: new Date().toISOString(),
      alt_text: $("alt").value,
      caption: $("caption").value,
    };
    saveDecisions();
    applyFilter();
    renderList();
    showCurrent();
  }

  function updateStats() {
    const n = state.filtered.length;
    const decided = Object.keys(state.decisions).length;
    $("stats").textContent = n
      ? "Showing " +
        (state.index + 1) +
        " / " +
        n +
        " · Decisions saved: " +
        decided
      : "No queue loaded";
  }

  function exportDecisions() {
    const blob = new Blob([JSON.stringify(state.decisions, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "photo-pipeline-decisions.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  $("file").addEventListener("change", async (ev) => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    applyBundle(JSON.parse(await file.text()));
  });
  $("search").addEventListener("input", () => {
    applyFilter();
    renderList();
    showCurrent();
  });
  $("filter").addEventListener("change", () => {
    applyFilter();
    renderList();
    showCurrent();
  });
  $("btn-reload").addEventListener("click", () => tryAutoLoad());
  $("btn-export-decisions").addEventListener("click", exportDecisions);
  $("prev").addEventListener("click", () => {
    state.index = Math.max(0, state.index - 1);
    renderList();
    showCurrent();
  });
  $("next").addEventListener("click", () => {
    state.index = Math.min(state.filtered.length - 1, state.index + 1);
    renderList();
    showCurrent();
  });

  document.querySelectorAll("[data-act]").forEach((btn) => {
    btn.addEventListener("click", () => decide(btn.getAttribute("data-act")));
  });

  $("btn-approve-safe").addEventListener("click", () => {
    if (!state.bundle) return;
    state.bundle.assets.forEach((a) => {
      if ((a.privacy && a.privacy.verdict) === "Safe") {
        state.decisions[a.id] = {
          decision: "approve",
          at: new Date().toISOString(),
          bulk: "approve_all_safe",
        };
      }
    });
    saveDecisions();
    applyFilter();
    renderList();
    showCurrent();
  });

  $("btn-reject-all").addEventListener("click", () => {
    if (!state.bundle) return;
    if (!confirm("Mark all currently pending items as rejected? (local decisions only)")) return;
    state.filtered.forEach((a) => {
      const st = effectiveStatus(a);
      if (["needs_review", "analyzed", "queued"].includes(st)) {
        state.decisions[a.id] = {
          decision: "reject",
          at: new Date().toISOString(),
          bulk: "reject_all_pending",
        };
      }
    });
    saveDecisions();
    applyFilter();
    renderList();
    showCurrent();
  });

  document.addEventListener("keydown", (ev) => {
    if (ev.target && ["INPUT", "TEXTAREA", "SELECT"].includes(ev.target.tagName)) {
      if (ev.key === "/" && ev.target.id !== "search") return;
      if (ev.key !== "Escape") return;
    }
    const k = ev.key.toLowerCase();
    if (k === "a") decide("approve");
    else if (k === "r") decide("reject");
    else if (k === "e") decide("needs_editing");
    else if (k === "h") decide("hide");
    else if (k === "n") $("next").click();
    else if (k === "p") $("prev").click();
    else if (k === "/") {
      ev.preventDefault();
      $("search").focus();
    }
  });

  tryAutoLoad();
})();
