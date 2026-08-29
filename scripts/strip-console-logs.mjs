#!/usr/bin/env node
/**
 * Remove console.log / console.debug / console.info from source files.
 * Preserves console.error and console.warn for production observability.
 *
 * Usage:
 *   node scripts/strip-console-logs.mjs          # dry run
 *   node scripts/strip-console-logs.mjs --write  # apply changes
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const WRITE = process.argv.includes("--write");
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  "coverage",
]);

const LOG_PATTERN =
  /^\s*console\.(log|debug|info)\([^;]*\);?\s*$/gm;

async function walk(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, files);
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

let totalRemoved = 0;
let filesChanged = 0;

const files = await walk(ROOT);

for (const file of files) {
  const original = await readFile(file, "utf8");
  const matches = original.match(LOG_PATTERN);
  if (!matches?.length) continue;

  const updated = original.replace(LOG_PATTERN, "");
  totalRemoved += matches.length;
  filesChanged += 1;

  const rel = path.relative(ROOT, file);
  console.log(`${WRITE ? "✓" : "→"} ${rel} (${matches.length} statement(s))`);

  if (WRITE) {
    await writeFile(file, updated, "utf8");
  }
}

console.log(
  `\n${WRITE ? "Removed" : "Would remove"} ${totalRemoved} console.log/debug/info call(s) across ${filesChanged} file(s).`
);

if (!WRITE && totalRemoved > 0) {
  console.log("Re-run with --write to apply.");
}
