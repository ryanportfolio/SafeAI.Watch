import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFacts, lintBeats, parseScript } from './lint-beats.mjs';

const FACTS_MD = `# Facts

## Facts

| ID | Fact | Exact text or value | Source | Published | Evidence type | Durability | Limits | Slice |
|---|---|---|---|---|---|---|---|---|
| B18 | Half use it daily | "Among BLV users, 51% reported using AI for visual descriptions at least once per day" | https://afb.org/x | 2026-08 | benefit | durable | Self-reported; "61 BLV users (21% of the BLV group)" | benefits |
| Q1 | Upside and downside | “It can give you a positive infinity of new benefits at the same time that it presents almost a negative infinity of risk in the same object.” | https://example.org/q | 2026-07-16 | perspective | durable | 27 words | harris |
| P9 | Colour test | "The organisation’s colour model, tested<br>in   labs." | https://example.org/p | 2026-05-07 | progress | perishable | Split | across | pipes | progress |
| P10 | Escaped | a \\| b | https://example.org/e | 2026-05 | progress | durable | 423 = 271 + 152 | progress |

## Look

| ID | Group | Fact | Exact text or value | Source | Published | Limits |
|---|---|---|---|---|---|---|
| K21 | Type | Italic subset | \`abc\` | scripts/brand/build-brand.mjs:334 | repo 2026-09-30 | No capitals |

## Hooks

| Evidence type | IDs | Rows |
|---|---|---|
| happened | H1-H47 | 47 |
`;

const facts = parseFacts(FACTS_MD);

const base = () => ({
  duration: 20,
  chapters: [{ id: 'c1', title: 'One', start: 0 }, { id: 'c2', title: 'Two', start: 10 }],
  beats: [
    {
      id: 'B1', start: 0, end: 6, type: 'benefit',
      statement: { text: 'Half of users use it daily', at: 0.5, rows: ['B18'], italic: ['daily'] },
      precision: { text: 'AFB · self-reported', at: 3.5, rows: ['B18'] },
      extra: [{ text: 'AFB · AUG', at: 0.2, rows: ['B18'], role: 'label' }],
    },
    {
      id: 'B2', start: 6, end: 20, type: 'quote',
      statement: { text: '“It can give you a positive infinity of new benefits”', at: 6.5, rows: ['Q1'], quote: true },
      extra: [{ text: 'Hold both at once', at: 7, owner: true, role: 'heading' }],
    },
  ],
});

const run = (film) => lintBeats(film, facts);
const has = (list, re) => list.some((m) => re.test(m));

test('parseFacts reads both tables, skips tables without ID, handles pipes and <br>', () => {
  assert.deepEqual([...facts.keys()].sort(), ['B18', 'K21', 'P10', 'P9', 'Q1']);
  assert.equal(facts.get('P9').exact, '"The organisation’s colour model, tested in   labs."');
  assert.equal(facts.get('P9').limits, 'Split | across | pipes');
  assert.equal(facts.get('P10').exact, 'a | b');
  assert.equal(facts.get('K21').limits, 'No capitals');
});

test('clean fixture passes with no failures or warnings', () => {
  const r = run(base());
  assert.deepEqual(r.failures, []);
  assert.deepEqual(r.warnings, []);
  assert.equal(r.beatsChecked, 2);
});

test('rule 1: statement reading time is measured to the precision line', () => {
  const f = base();
  f.beats[0].precision.at = 2.0; // 6 words need 2.5 s from 0.5
  const r = run(f);
  assert.ok(has(r.failures, /^B1 statement: reading time short by 1\.00 s/), r.failures.join('\n'));
});

test('rule 1: statement without precision is measured to beat end', () => {
  const f = base();
  delete f.beats[0].precision;
  f.beats[0].end = 2.9; // needs 2.5 s from 0.5, has 2.4
  f.beats[0].extra[0].at = 0.2;
  const r = run(f);
  assert.ok(has(r.failures, /^B1 statement: reading time short by 0\.10 s/), r.failures.join('\n'));
  f.beats[0].end = 3.0; // exactly enough
  assert.ok(!has(run(f).failures, /reading time/));
});

test('rule 1: precision needs 0.25 s per word to beat end', () => {
  const f = base();
  f.beats[0].precision.text = 'one two three four five six seven eight'; // 2 s
  f.beats[0].precision.at = 4.5; // has 1.5 s
  const r = run(f);
  assert.ok(has(r.failures, /^B1 precision: reading time short by 0\.50 s/), r.failures.join('\n'));
});

test('rule 2: missing rows, unknown rows, owner lines', () => {
  const f = base();
  delete f.beats[0].extra[0].rows;
  f.beats[0].precision.rows = ['B18', 'Z99'];
  f.beats[1].extra[0].rows = [];
  const r = run(f);
  assert.ok(has(r.failures, /^B1 extra\[0\]: no source/));
  assert.ok(has(r.failures, /^B1 precision: row "Z99" does not exist/));
  assert.ok(!has(r.failures, /^B2 extra\[0\]/), 'owner: true with empty rows passes');
});

test('rule 3: quote substring with curly/straight equivalence and dropped period', () => {
  const f = base();
  f.beats[1].statement.text = '"It can give you a positive infinity of new benefits at the same time that it presents almost a negative infinity of risk in the same object"';
  assert.deepEqual(run(f).failures, []);
  f.beats[1].statement.text = '“It can give you a positive infinity of new benefits at the same time that it presents almost a negative infinity of risk in the same object.”';
  assert.deepEqual(run(f).failures, []);
});

test('rule 3: quote with changed words or spelling fails', () => {
  const f = base();
  f.beats[1].statement.text = '“It can give you a positive infinity of benefits”';
  assert.ok(has(run(f).failures, /^B2 statement: quote is not an exact substring of the Exact text of Q1/));

  const g = base();
  g.beats[1].statement = { text: '‘The organization’s color model, tested in labs’', at: 6.5, rows: ['P9'], quote: true };
  assert.ok(has(run(g).failures, /quote is not an exact substring/), 'American spelling must not match');
  g.beats[1].statement.text = '"The organisation\'s colour model, tested in labs"';
  assert.ok(!has(run(g).failures, /quote/), 'apostrophe and <br>/whitespace normalize');
});

test('rule 3: quote matches if any listed row contains it', () => {
  const f = base();
  f.beats[1].statement.rows = ['B18', 'Q1'];
  assert.ok(!has(run(f).failures, /quote/));
});

test('rule 4: italic entries must be in the text and use the subset only', () => {
  const f = base();
  f.beats[0].statement.italic = ['weekly', 'Daily', 'it daily'];
  const r = run(f);
  assert.ok(has(r.failures, /^B1 statement: italic "weekly" is not in the text/));
  assert.ok(has(r.failures, /^B1 statement: italic "Daily" has characters outside/));
  assert.ok(!has(r.failures, /"it daily"/));
  const g = base();
  g.beats[0].statement.text = 'Users’ tools, in tests: daily';
  g.beats[0].statement.italic = ['’ tools, in tests: daily'];
  assert.ok(!has(run(g).failures, /italic/));
  g.beats[0].statement.italic = ['in tests!'];
  assert.ok(has(run(g).failures, /italic "in tests!" has characters outside .*"!"/));
});

test('rule 5: terminal periods and em dashes', () => {
  const f = base();
  f.beats[0].statement.text = 'Half of users use it daily.';
  f.beats[0].extra[0].text = 'AFB · AUG 2026.';
  f.beats[1].extra[0].text = 'Hold both — at once';
  f.beats[0].precision.text = 'AFB · 2026.'; // precision may end in a period
  const r = run(f);
  assert.ok(has(r.failures, /^B1 statement: display text ends in a period/));
  assert.ok(has(r.failures, /^B1 extra\[0\]: display text ends in a period/));
  assert.ok(has(r.failures, /^B2 extra\[0\]: contains an em dash/));
  assert.ok(!has(r.failures, /^B1 precision: display/));

  const g = base();
  g.beats[0].extra[0].role = 'caption';
  g.beats[0].extra[0].text = 'Plain caption.';
  g.beats[1].statement.text = '“It can give you a positive infinity of new benefits at the same time that it presents almost a negative infinity of risk in the same object.”';
  assert.ok(!has(run(g).failures, /period/), 'other roles and quotes keep their punctuation');
});

test('rule 6: timeline order, overlap, duration, at, chapters', () => {
  const f = base();
  f.beats[1].start = 5; // overlaps B1 (ends 6)
  f.beats[1].end = 21; // past duration
  f.beats[0].extra[0].at = 6; // at == end is outside
  f.chapters[1].start = 0;
  const r = run(f);
  assert.ok(has(r.failures, /^B2: starts at 5, overlapping previous beat B1/));
  assert.ok(has(r.failures, /^B2: end 21 is past duration 20/));
  assert.ok(has(r.failures, /^B1 extra\[0\]: at 6 is outside the beat/));
  assert.ok(has(r.failures, /^chapter c2: start 0 does not come after chapter c1/));

  const g = base();
  g.beats.reverse();
  assert.ok(has(run(g).failures, /^B1: starts at 0, before previous beat B2 .* must be sorted/));

  const h = base();
  h.chapters[1].start = 25;
  assert.ok(has(run(h).failures, /^chapter c2: start 25 is outside/));
});

test('rule 7: numbers not in Exact text or Limits warn but do not fail', () => {
  const f = base();
  f.beats[0].statement.text = 'Half of users use it daily, 61 of them harmed'; // 61 is in Limits
  f.beats[0].precision.text = 'AFB · 2025 · 52%'; // neither 2025 nor 52 appear
  f.beats[0].precision.at = 4.5;
  f.beats[0].end = 6.5;
  f.beats[1].start = 6.5;
  const r = run(f);
  assert.deepEqual(r.failures, []);
  assert.ok(!has(r.warnings, /number 61/));
  assert.ok(has(r.warnings, /^B1 precision: number 2025 not found/));
  assert.ok(has(r.warnings, /^B1 precision: number 52 not found/));

  const g = base();
  g.beats[1].extra[0].text = 'Hold 2 at once';
  assert.ok(has(run(g).warnings, /^B2 extra\[0\]: number 2 has no source row/));
  g.beats[1].statement.text = '“It can give you 99 benefits”'; // quotes skip rule 7
  assert.ok(!has(run(g).warnings, /number 99/));
});

test('CLI exits 1 on failure, 0 on pass, and prints a summary', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lint-beats-'));
  const factsPath = join(dir, 'facts.md');
  writeFileSync(factsPath, FACTS_MD);
  const script = join(dirname(fileURLToPath(import.meta.url)), 'lint-beats.mjs');

  const good = join(dir, 'good.json');
  writeFileSync(good, JSON.stringify(base()));
  const ok = spawnSync(process.execPath, [script, good, factsPath], { encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.match(ok.stdout, /lint-beats: 2 beats checked, 0 failures, 0 warnings/);

  const f = base();
  f.beats[0].statement.text += '.';
  const bad = join(dir, 'bad.json');
  writeFileSync(bad, JSON.stringify(f));
  const ko = spawnSync(process.execPath, [script, bad, factsPath], { encoding: 'utf8' });
  assert.equal(ko.status, 1);
  assert.match(ko.stdout, /FAIL B1 statement: display text ends in a period/);
  assert.match(ko.stdout, /1 failure,/);
});

const SCRIPT_MD = `# Script

| # | Caption | Small line | Picture |
|---|---|---|---|
| 1 | Is AI good or bad for us? | | Blank chart |
| 13 | "It can give you a positive infinity" | Tristan Harris, July 2026 (Q1) | Current |
| 24 | Stay close to *the evidence* · SafeAI.watch | A public record of AI safety and security (S25, S13) | End card |

## Other strings on screen

| Where | Text | Source |
|---|---|---|
| Labels chapter | DOOMER, ACCELERATIONIST | usage |
| Tag | GOOGLE'S TAG | H23 |
| Before line 23 | Is AI good or bad for us? (faint echo) | OWNER |
`;

test('parseScript collects captions, small lines, split end-card parts and the appendix', () => {
  const s = parseScript(SCRIPT_MD);
  for (const x of ['Is AI good or bad for us?', 'It can give you a positive infinity', 'Tristan Harris, July 2026', 'Stay close to the evidence', 'SafeAI.watch', 'A public record of AI safety and security', 'DOOMER', 'ACCELERATIONIST', "GOOGLE'S TAG"]) {
    assert.ok(s.has(x), x);
  }
  assert.ok(!s.has('Blank chart'), 'picture column is not on screen');
  assert.ok(!s.has('Is AI good or bad for us? (faint echo)'), 'trailing note is dropped');
});

test('script sync: a string missing from SCRIPT.md fails; curly apostrophes match straight ones', () => {
  const script = parseScript(SCRIPT_MD);
  const f = base();
  f.beats[0].statement = { text: 'Is AI good or bad for us?', at: 1, owner: true };
  delete f.beats[0].precision;
  f.beats[0].extra = [{ text: 'GOOGLE’S TAG', at: 1, rows: ['B18'], role: 'label' }];
  f.beats[1].statement = { text: 'A line the script never had', at: 11, owner: true };
  delete f.beats[1].precision;
  f.beats[1].extra = [];
  const r = lintBeats(f, facts, script);
  assert.ok(r.failures.some((x) => /B2 statement: text is not in SCRIPT\.md/.test(x)), r.failures.join('\n'));
  assert.ok(!r.failures.some((x) => /B1 .*not in SCRIPT\.md/.test(x)), r.failures.join('\n'));
  // without a script the rule is off
  assert.ok(!lintBeats(f, facts).failures.some((x) => /SCRIPT\.md/.test(x)));
});
