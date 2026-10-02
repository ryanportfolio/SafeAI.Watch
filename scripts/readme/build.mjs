// Builds the README and its art from src/data/events.json, then checks the result.
//
//   node scripts/readme/build.mjs           write README.md and assets/readme/*.svg
//   node scripts/readme/build.mjs --check   build into a temp dir and fail if the
//                                           committed files differ or any check fails
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadFacts } from './facts.mjs';
import { ROOT, outDir } from './lib.mjs';
import { buildPanels } from './panels.mjs';
import { buildReadme, checkReadme } from './readme.mjs';
import { checkPanels } from './verify.mjs';

const check = process.argv.includes('--check');
if (check) process.env.README_OUT_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'readme-check-'));
const OUT = outDir();

const facts = loadFacts();
const files = buildPanels(facts);
const md = buildReadme(facts);
fs.writeFileSync(path.join(OUT, 'README.md'), md);
files.push('README.md');

const bad = [...checkPanels(facts, OUT), ...checkReadme(md, facts, ROOT)];

if (check) {
  // Compare ignoring line endings: the checkout may be CRLF, the build writes LF.
  const norm = (s) => s.replace(/\r\n/g, '\n');
  for (const rel of files) {
    const committed = path.join(ROOT, rel);
    if (!fs.existsSync(committed)) { bad.push(`${rel} is not committed`); continue; }
    if (norm(fs.readFileSync(committed, 'utf8')) !== norm(fs.readFileSync(path.join(OUT, rel), 'utf8'))) {
      bad.push(`${rel} is out of date; run node scripts/readme/build.mjs and commit the result`);
    }
  }
  fs.rmSync(OUT, { recursive: true, force: true });
}

if (bad.length) {
  for (const b of bad) console.error(`FAIL ${b}`);
  process.exit(1);
}
console.log(`${check ? 'Checked' : 'Built'} README.md and ${files.length - 1} panels: ${facts.entries} entries, latest ${facts.last}.`);
