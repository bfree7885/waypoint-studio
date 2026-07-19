#!/usr/bin/env node
/**
 * Print docs/.platform-audit-2026-07.print.html → docs/PLATFORM-AUDIT-2026-07.pdf
 * Uses Puppeteer (via md-to-pdf) with professional header/footer.
 */
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const require = createRequire(path.join(ROOT, "package.json"));

// Resolve puppeteer from md-to-pdf install
let puppeteer;
try {
  puppeteer = require("puppeteer");
} catch {
  puppeteer = require(path.join(ROOT, "node_modules/md-to-pdf/node_modules/puppeteer"));
}

const htmlPath = path.join(ROOT, "docs", ".platform-audit-2026-07.print.html");
const pdfPath = path.join(ROOT, "docs", "PLATFORM-AUDIT-2026-07.pdf");
const fileUrl = pathToFileURL(htmlPath).href;

const footerTemplate = `
  <div style="width:100%;font-size:8px;font-family:Helvetica,Arial,sans-serif;color:#4a554e;padding:0 28px;display:flex;justify-content:space-between;align-items:center;">
    <span>Waypoint Studio · Platform Audit</span>
    <span>12 July 2026</span>
    <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
  </div>
`;

const headerTemplate = `<div></div>`;

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none"]
});

try {
  const page = await browser.newPage();
  await page.goto(fileUrl, { waitUntil: "networkidle0", timeout: 120000 });
  await page.pdf({
    path: pdfPath,
    format: "Letter",
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate,
    footerTemplate,
    margin: {
      top: "0.75in",
      bottom: "0.85in",
      left: "0.7in",
      right: "0.7in"
    },
    preferCSSPageSize: false
  });
  console.log("Wrote", pdfPath);
} finally {
  await browser.close();
}
