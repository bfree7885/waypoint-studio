#!/usr/bin/env node
/**
 * Waypoint dusk-desert color system gate.
 * Hierarchy: dark earth → sand/cream → terracotta → ochre → restrained purple.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;
const pass = (m) => console.log("PASS", m);
const fail = (m) => {
  console.error("FAIL", m);
  failed += 1;
};
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const tokens = read("design-system/css/wds-tokens.css");
const shell = read("design-system/css/wds-app-shell.css");
const components = read("design-system/css/wds-components.css");
const aurora = read("design-system/css/wds-aurora-bridge.css");
const docs = read("docs/SOUTHWEST-COLOR-SYSTEM.md");

function hexNear(src, token, expected) {
  const re = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*:\\s*(#[0-9a-fA-F]{6})");
  const m = src.match(re);
  if (!m) return false;
  const got = m[1].toLowerCase();
  const exp = expected.toLowerCase();
  if (got === exp) return true;
  const parse = (h) => [0, 2, 4].map((i) => parseInt(h.slice(1 + i, i + 3), 16));
  const [a, b] = [parse(got), parse(exp)];
  const dist = Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
  return dist <= 28;
}

if (/--waypoint-charcoal:\s*#181513/i.test(tokens) && hexNear(tokens, "--waypoint-charcoal", "#181513")) {
  pass("charcoal ground locked near #181513");
} else fail("charcoal ground missing or drifted");

if (/--waypoint-espresso:\s*#251c20/i.test(tokens)) pass("espresso raised surface locked");
else fail("espresso raised surface missing");

if (/--waypoint-bone:\s*#f0e1c3/i.test(tokens)) pass("bone / primary text locked");
else fail("bone text not locked");

if (/--waypoint-tan:\s*#bfa98c/i.test(tokens)) pass("tan / secondary text locked");
else fail("tan secondary text not locked");

if (/--waypoint-orange:\s*#d46a3a/i.test(tokens) && /--wp-brand:\s*var\(--waypoint-orange\)/.test(tokens)) {
  pass("terracotta is the Waypoint brand signature");
} else fail("terracotta brand token missing");

if (/--wp-accent-gold:\s*var\(--waypoint-gold\)/.test(tokens) && /--waypoint-gold:\s*#d7a72e/i.test(tokens)) {
  pass("ochre secondary accent present");
} else fail("ochre accent missing");

if (/--wp-accent-purple:\s*var\(--waypoint-purple\)/.test(tokens) && /--waypoint-purple:\s*#79506f/i.test(tokens)) {
  pass("desert purple is a named supporting token");
} else fail("desert purple token missing");

if (/--wp-accent-field:\s*var\(--wp-sage\)/.test(tokens) && /--wp-sage:\s*#73806a/i.test(tokens)) {
  pass("sage field accent present");
} else fail("sage field accent missing");

if (/--wp-bg:\s*var\(--waypoint-charcoal\)/.test(tokens) && /--wp-elevated:\s*var\(--waypoint-espresso\)/.test(tokens)) {
  pass("semantic ground maps charcoal → espresso");
} else fail("semantic ground not mapped to earth stack");

if (/--wp-fog:\s*rgba\(191,\s*169,\s*140/.test(tokens) && !/--wp-fog:\s*rgba\(112,\s*68,\s*111/.test(tokens)) {
  pass("borders use tan fog, not purple fog");
} else fail("purple fog still owns borders");

if (/--wp-on-accent:\s*var\(--waypoint-charcoal\)/.test(tokens)) {
  pass("on-accent is charcoal (cream-on-orange fails WCAG)");
} else fail("on-accent not charcoal");

const articles = tokens.split('[data-product="articles"]')[1] || "";
const dfd = tokens.split('[data-product="deep-forest-dispatch"]')[1] || "";
if (/--wp-accent:\s*var\(--waypoint-orange\)/.test(articles) && !/--wp-accent:\s*var\(--waypoint-purple\)/.test(articles.split("[data-product")[0] || articles)) {
  pass("Articles accent is terracotta, not purple");
} else fail("Articles still uses purple as primary accent");

if (/--wp-accent:\s*var\(--waypoint-orange\)/.test(dfd)) pass("DFD accent is terracotta, not purple");
else fail("DFD still uses purple as primary accent");

if (/\[data-product="waypoint-deck"\][\s\S]*--wp-accent:\s*var\(--waypoint-orange\)/.test(tokens) &&
    /\[data-product="waypoint-deck"\][\s\S]*--wp-warm:\s*var\(--waypoint-purple\)/.test(tokens)) {
  pass("Deck public shell is terracotta + desert purple");
} else fail("Deck product tokens missing");

if (
  /\[data-product="shed-hunting"\][\s\S]{0,800}--wp-warm:\s*var\(--wp-sage\)/.test(tokens) ||
  /\[data-product="shed-hunting"\][\s\S]{0,800}--wp-warm:\s*#6f7d5f/.test(tokens)
) {
  pass("Sheds warm pairing is sage");
} else fail("Sheds not paired with sage");

const scenes = tokens.split('[data-product="scenes"]')[1] || "";
if (/--wp-accent:\s*var\(--waypoint-gold\)/.test(scenes) && /--wp-warm:\s*var\(--waypoint-orange\)/.test(scenes)) {
  pass("Scenes pairing is ochre + terracotta");
} else fail("Scenes pairing not ochre + terracotta");

if (/\.was-brand__mark[\s\S]{0,180}--wp-brand/.test(shell) && !/\.was-brand__mark[\s\S]{0,120}--wp-accent/.test(shell.split(".was-brand__mark")[2] || "")) {
  pass("header brand mark binds to --wp-brand");
} else fail("header brand mark still follows product accent");

if (/\.wds-brand__mark[\s\S]{0,200}--wp-brand/.test(components) && !/linear-gradient\(145deg,\s*var\(--wds-lime\),\s*var\(--wds-purple\)\)/.test(components)) {
  pass("shared brand mark is solid terracotta, not lime/purple gradient");
} else fail("component brand mark still lime/purple");

if (/\.was-apps-btn[\s\S]{0,400}--wp-brand/.test(shell) && /--wp-surface-raised|--wp-elevated/.test(shell.match(/\.was-apps-btn\s*\{[\s\S]{0,500}\}/)[0] || "")) {
  pass("Explore uses raised surface + terracotta border");
} else fail("Explore button not restyled to dusk-desert");

if (!/\.was-apps-btn[\s\S]{0,250}background:\s*var\(--wds-accent\)/.test(shell)) {
  pass("Explore is not a filled accent pill");
} else fail("Explore is a filled accent button");

if (/\.was-primary-nav__link\[aria-current="page"\][\s\S]{0,180}--wp-brand/.test(aurora)) {
  pass("global active nav underline uses --wp-brand");
} else fail("global active nav still follows product accent color");

if (docs.includes("dark earth") && docs.includes("--wp-brand") && docs.includes("terracotta")) {
  pass("palette doc describes dusk-desert hierarchy");
} else fail("palette doc missing dusk-desert contract");

if (failed) {
  console.error("\n" + failed + " failure(s)");
  process.exit(1);
}
console.log("\nAll dusk-desert color system gates passed.");
