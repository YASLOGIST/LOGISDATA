#!/usr/bin/env node
/**
 * Enforces the initial-payload budget for the landing page.
 *
 * Measures what a first-time visitor downloads to get a painted page: every
 * <script src> and <link rel=stylesheet> in the prerendered HTML of `/`,
 * plus the HTML itself, gzipped. The Three.js runtime is a lazy chunk that
 * the document does not reference, so it is deliberately out of scope here;
 * the total JavaScript ceiling is enforced by tests/e2e/performance.spec.ts.
 *
 * Usage: node scripts/bundle-budget.mjs [--url http://127.0.0.1:3100]
 */
import { gzipSync } from "node:zlib";

const BUDGET_GZIP_BYTES = Number(process.env.COVER_BUDGET_BYTES ?? 205_000);

const urlArgIndex = process.argv.indexOf("--url");
const origin = urlArgIndex === -1 ? "http://127.0.0.1:3100" : process.argv[urlArgIndex + 1];

async function fetchBytes(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

const html = await fetchBytes(`${origin}/`);
const markup = html.toString("utf8");

const assets = [
  ...markup.matchAll(/<script[^>]+src="([^"]+)"/g),
  ...markup.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g),
  ...markup.matchAll(/<link[^>]+href="([^"]+)"[^>]+rel="stylesheet"/g),
].map((match) => match[1]);

let total = gzipSync(html).length;
const rows = [["document", total]];

for (const asset of [...new Set(assets)]) {
  const url = asset.startsWith("http") ? asset : `${origin}${asset}`;
  const bytes = await fetchBytes(url);
  const gzipped = gzipSync(bytes).length;
  total += gzipped;
  rows.push([asset.split("/").pop(), gzipped]);
}

for (const [name, size] of rows.sort((a, b) => b[1] - a[1])) {
  console.log(`${String(size).padStart(8)} B gz  ${name}`);
}
console.log("-".repeat(46));
console.log(`${String(total).padStart(8)} B gz  TOTAL (budget ${BUDGET_GZIP_BYTES})`);

if (total > BUDGET_GZIP_BYTES) {
  console.error(`\nFAIL: cover payload exceeds the budget by ${total - BUDGET_GZIP_BYTES} B.`);
  process.exit(1);
}
console.log("PASS");
