// The GitHub About panel (description, website, topics) kept in scripts/readme/repo.json.
//
//   node scripts/readme/meta.mjs --lint    offline: repo.json has the right shape (pull requests)
//   node scripts/readme/meta.mjs --check   live: GitHub matches repo.json and every remote README
//                                          link answers below 400 (pushes to main; needs GH_TOKEN)
//   node scripts/readme/meta.mjs --apply   write repo.json to GitHub, then --check
//
// --check and --apply use the gh CLI. The README build stays offline; remote links are
// checked here so a third-party outage never fails an unrelated change.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, read } from './lib.mjs';

const REPO = 'ryanportfolio/SafeAI.Watch';
const mode = process.argv[2];
const meta = JSON.parse(read('scripts/readme/repo.json'));

function lint() {
  const bad = [];
  const keys = Object.keys(meta).sort().join(',');
  if (keys !== 'description,homepage,topics') bad.push(`repo.json keys are ${keys}; expected description, homepage, topics`);
  if (typeof meta.description !== 'string' || !meta.description.trim()) bad.push('description is empty');
  else if (meta.description.length > 350) bad.push(`description is ${meta.description.length} characters; GitHub allows 350`);
  if (typeof meta.homepage !== 'string' || (meta.homepage && !/^https:\/\//.test(meta.homepage))) bad.push('homepage must be an https URL or an empty string');
  if (!Array.isArray(meta.topics) || meta.topics.length > 20) bad.push('topics must be a list of at most 20');
  for (const t of meta.topics || []) if (!/^[a-z0-9][a-z0-9-]{0,49}$/.test(t)) bad.push(`topic "${t}" must be lowercase letters, digits and hyphens`);
  if (new Set(meta.topics).size !== (meta.topics || []).length) bad.push('topics repeat');
  return bad;
}

const gh = (args, input) => execFileSync('gh', args, { encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'pipe'] });

async function check() {
  const bad = [];
  const live = JSON.parse(gh(['api', `repos/${REPO}`]));
  if ((live.description || '') !== meta.description) bad.push('description on GitHub differs from repo.json');
  if ((live.homepage || '') !== meta.homepage) bad.push(`homepage on GitHub is "${live.homepage || ''}", repo.json says "${meta.homepage}"`);
  const topics = [...(live.topics || [])].sort().join(',');
  if (topics !== [...meta.topics].sort().join(',')) bad.push(`topics on GitHub are [${topics}]`);
  const md = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  const links = [...new Set([...md.matchAll(/\]\((https?:\/\/[^)\s]+)\)|href="(https?:\/\/[^"]+)"/g)].map((m) => m[1] || m[2]))];
  for (const url of links) {
    let status = 0;
    for (const method of ['HEAD', 'GET']) {
      try { status = (await fetch(url, { method, redirect: 'follow' })).status; } catch { status = 0; }
      if (status && status < 400) break;
    }
    if (!status || status >= 400) bad.push(`README link ${url} answered ${status || 'no response'}`);
  }
  return bad;
}

function apply() {
  gh(['api', '--method', 'PATCH', `repos/${REPO}`, '--input', '-'], JSON.stringify({ description: meta.description, homepage: meta.homepage }));
  gh(['api', '--method', 'PUT', `repos/${REPO}/topics`, '--input', '-'], JSON.stringify({ names: meta.topics }));
}

let bad = lint();
if (!bad.length && (mode === '--check' || mode === '--apply')) {
  if (mode === '--apply') apply();
  bad = await check();
} else if (!['--lint', '--check', '--apply'].includes(mode)) {
  console.error('usage: node scripts/readme/meta.mjs --lint | --check | --apply');
  process.exit(2);
}
if (bad.length) {
  for (const b of bad) console.error(`FAIL ${b}`);
  process.exit(1);
}
console.log(`About panel ${mode === '--lint' ? 'file is valid' : 'matches repo.json'}.`);
