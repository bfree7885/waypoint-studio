#!/usr/bin/env node
/**
 * Scenes + Publishing unification — matching honesty, hub joins, DFD series framing.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import vm from "vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
let failed = 0;

function assert(name, cond, detail) {
  if (cond) console.log("PASS", name);
  else {
    failed++;
    console.log("FAIL", name, detail || "");
  }
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const docs = read("docs/SCENES-PUBLISHING.md");
assert("scenes-publishing doc", /Deep Forest Dispatch/.test(docs) && /matchDiscovery/.test(docs));
assert("product direction points to scenes-publishing", /SCENES-PUBLISHING\.md/.test(read("docs/PRODUCT-DIRECTION.md")));

const rel = JSON.parse(read("data/publishing/content-relationships.json"));
assert("12 stories in relationships", rel.stories && rel.stories.length === 12);
assert("valley fog present", rel.stories.some((s) => s.id === "valley-fog-at-dawn"));
assert("mount hood has video", rel.stories.some((s) => s.id === "mount-hood-rain-shadow" && s.youtubeVideoId));

const sb = { console, window: {}, global: {}, WDS: {} };
sb.window = sb;
sb.global = sb;
vm.runInNewContext(read("design-system/js/platform/wds-publishing-match.js"), sb, {
  filename: "wds-publishing-match.js"
});
const Match = sb.WDS.publishingMatch;
Match.setCatalog(rel);

assert(
  "no match without evidence",
  Match.matchDiscovery({ signals: [{ id: "x", title: "Mild afternoon", category: "temperature", evidence: [{ metric: "t", value: 70 }] }], platform: null }) == null
);

const fogHit = Match.matchDiscovery({
  signals: [{ id: "fog-1", title: "Valley fog likely", summary: "Mist in the hollows", category: "precipitation", evidence: [{ metric: "conditions", value: "fog" }] }]
});
assert("fog keyword matches valley fog", fogHit && fogHit.id === "valley-fog-at-dawn", fogHit && fogHit.id);

const condHit = Match.matchDiscovery({
  signals: [],
  now: new Date("2026-08-25T06:30:00"),
  platform: {
    weatherRef: {
      meta: { isPlaceholder: false },
      current: { humidity: 92, temperature: 48, wind: { speed: 2 } }
    }
  }
});
assert("quiet-humid-cool matches valley fog", condHit && condHit.id === "valley-fog-at-dawn");
assert("condition match labeled not forecast", /not a fog forecast|editorial/i.test(condHit.why + " " + condHit.basedOn));

const dayHit = Match.matchDiscovery({
  signals: [],
  now: new Date("2026-08-25T14:00:00"),
  platform: {
    weatherRef: {
      meta: { isPlaceholder: false },
      current: { humidity: 92, temperature: 48, wind: { speed: 2 } }
    }
  }
});
assert("afternoon does not false-match fog rule", dayHit == null);

vm.runInNewContext(read("design-system/js/dashboard/rebuild/wds-dashboard-rebuild-deepeners.js"), sb, {
  filename: "deepeners.js"
});
const Deepen = sb.WDS.dashboardRebuildDeepeners;
const understand = Deepen.resolveUnderstand({
  signals: [{ id: "fog-1", title: "Valley fog", evidence: [{ metric: "x", value: 1 }] }]
});
assert("deepeners resolve understand", understand && understand.href.indexOf("valley-fog") >= 0);

const skeleton = Deepen.render();
assert("understand section in skeleton", /data-deepen="understand"/.test(skeleton));
assert("understand starts hidden", /data-deepen="understand" hidden/.test(skeleton));
assert("no OpenRoad in deepeners", !/OpenRoad|Fieldry|Savant/.test(skeleton));

const scenesHub = read("apps/scenes/index.html");
assert("scenes hub explore framing", /Explore &amp; understand|See the world differently/.test(scenesHub));
assert("scenes hub DFD stories", /deep-forest-dispatch/.test(scenesHub) && /valley-fog-at-dawn/.test(scenesHub));
assert("scenes hub no OpenRoad", !/OpenRoad/.test(scenesHub));

const short = read("scenes/index.html");
assert("short /scenes/ redirects to hub", /apps\/scenes\//.test(short) && !/photo-coach/.test(short));

const dfd = read("deep-forest-dispatch/index.html");
assert("dfd editorial series framing", /editorial series|Waypoint Publishing/i.test(dfd));
assert("dfd links scenes articles dashboard", /apps\/scenes\//.test(dfd) && /articles\//.test(dfd) && /dashboard\//.test(dfd));

const hood = read("deep-forest-dispatch/stories/mount-hood-rain-shadow/index.html");
assert("hood watch the story", /Watch the story/.test(hood));
assert("hood browse articles", /Browse Articles/.test(hood));
assert("hood youtube embed or link", /ue74ge9Bz7U|youtube/.test(hood));

const articles = read("articles/index.html");
assert("articles link scenes", /apps\/scenes\//.test(articles));
assert("articles link dfd", /deep-forest-dispatch/.test(articles));

const wds = read("design-system/js/wds.js");
assert(
  "wds loads match before deepeners",
  wds.indexOf("wds-publishing-match.js") < wds.indexOf("wds-dashboard-rebuild-deepeners.js")
);

if (failed) {
  console.error("\nSCENES PUBLISHING: FAIL (" + failed + ")");
  process.exit(1);
}
console.log("\nSCENES PUBLISHING: PASS");
