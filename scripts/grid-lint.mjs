#!/usr/bin/env node
/**
 * scripts/grid-lint.mjs
 *
 * Imports every builder registered in src/pages/ (via the router registry),
 * calls each builder with its sample / offline data, and checks that every
 * resulting page is exactly 24 rows × 40 cells.
 *
 * Usage:
 *   node scripts/grid-lint.mjs           # print pass + failures
 *   node scripts/grid-lint.mjs --quiet   # print failures only
 *
 * Exit code:
 *   0  all pages pass
 *   1  one or more pages fail (or no builders were registered)
 */

import { readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const QUIET = process.argv.includes('--quiet');

// ── Helpers ────────────────────────────────────────────────────────────────

function log(...args)  { if (!QUIET) console.log(...args); }
function warn(...args) { console.warn(...args); }          // always printed

function checkPage(page, label) {
  const errors = [];

  if (!page || typeof page !== 'object') {
    return [`${label}: not a Page object (got ${typeof page})`];
  }

  if (!Array.isArray(page.rows)) {
    errors.push(`${label}: rows is not an array`);
  } else {
    if (page.rows.length !== 24) {
      errors.push(`${label}: row count is ${page.rows.length}, expected 24`);
    }
    for (let r = 0; r < page.rows.length; r++) {
      const row = page.rows[r];
      if (!Array.isArray(row)) {
        errors.push(`${label}: rows[${r}] is not an array`);
      } else if (row.length !== 40) {
        errors.push(`${label}: rows[${r}].length is ${row.length}, expected 40`);
      }
    }
  }

  return errors;
}

// ── Discover and import page builders ─────────────────────────────────────

async function main() {
  const root = new URL('..', import.meta.url);
  const pagesDir = new URL('src/pages/', root);

  let entries;
  try {
    entries = await readdir(pagesDir.pathname);
  } catch {
    warn('No src/pages/ directory found — nothing to lint.');
    process.exit(0);
  }

  const jsFiles = entries.filter(f => f.endsWith('.js')).sort();

  if (jsFiles.length === 0) {
    warn('No .js files found in src/pages/ — nothing to lint.');
    process.exit(0);
  }

  // Import each module. Side effect: builders self-register via registerPage().
  for (const file of jsFiles) {
    const fileUrl = new URL(`src/pages/${file}`, root);
    try {
      await import(fileUrl.href);
    } catch (err) {
      warn(`  ✗ IMPORT ERROR: src/pages/${file}: ${err.message}`);
    }
  }

  // Now retrieve the registry.
  const { getRegistry } = await import(new URL('src/teletext/router.js', root).href);
  const registry = getRegistry();

  if (registry.size === 0) {
    warn('Registry is empty — no builders registered.');
    process.exit(1);
  }

  log(`Checking ${registry.size} registered page builder(s)...\n`);

  let totalPages  = 0;
  let failedPages = 0;

  // Sample / offline data stubs for each known page.
  const STUBS = {
    100: undefined,
    101: undefined,
    110: undefined,
    199: undefined,
    300: undefined,
    400: undefined,
    500: undefined,
    666: undefined,
    700: undefined,
    888: undefined,
  };

  for (const [pageNumber, builder] of [...registry.entries()].sort((a, b) => a[0] - b[0])) {
    const stub = STUBS[pageNumber] ?? undefined;

    let pages;
    try {
      pages = await builder(stub);
    } catch (err) {
      warn(`  ✗ P${pageNumber}: builder threw: ${err.message}`);
      failedPages++;
      totalPages++;
      continue;
    }

    if (!Array.isArray(pages)) {
      warn(`  ✗ P${pageNumber}: builder returned ${typeof pages}, expected Page[]`);
      failedPages++;
      totalPages++;
      continue;
    }

    for (let sp = 0; sp < pages.length; sp++) {
      totalPages++;
      const label   = pages.length > 1 ? `P${pageNumber}/${sp + 1}` : `P${pageNumber}`;
      const errors  = checkPage(pages[sp], label);
      if (errors.length > 0) {
        failedPages++;
        errors.forEach(e => warn(`  ✗ ${e}`));
      } else {
        log(`  ✓ ${label}  (24 × 40)`);
      }
    }
  }

  log('');
  log(`Checked ${totalPages} page(s) across ${registry.size} builder(s).`);

  if (failedPages > 0) {
    warn(`${failedPages} page(s) failed the 24 × 40 invariant.`);
    process.exit(1);
  } else {
    log('All pages pass the 24 × 40 invariant. ✓');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
