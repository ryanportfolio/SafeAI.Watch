// Free-first X and Bluesky reads for the daily-watch signals lane.
//
//   node x-signals.mjs timelines --since 2026-10-14 [--handles a,b] [--pages 10]
//   node x-signals.mjs post <url-or-id> [...]
//   node x-signals.mjs search "<query>" --since 2026-10-14 [--no-x] [--no-bsky]
//   --min-likes N drops posts with fewer likes on any command (default 0).
//
// stdout: one JSON object per line: { platform, url, date, author, via, repost, likes, text }.
// stderr: one JSON object per line for each route that failed: { gap, route, detail }.
// A failed route never stops the run; the exit code is 0 unless every route of a command failed.
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const TWITTER_SCRIPT = path.join(os.homedir(), '.claude', 'skills', 'twitter-search', 'search.mjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const [cmd, ...rest] = process.argv.slice(2);
const flags = {};
const args = [];
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith('--')) {
    const key = rest[i].slice(2);
    const next = rest[i + 1];
    if (next === undefined || next.startsWith('--')) flags[key] = true;
    else { flags[key] = next; i++; }
  } else args.push(rest[i]);
}

const minLikes = Number(flags['min-likes'] ?? 0);
const emit = (o) => { if ((o.likes ?? 0) >= minLikes) console.log(JSON.stringify(o)); };
const gap = (route, detail) => console.error(JSON.stringify({ gap: true, route, detail: String(detail).trim().slice(0, 300) }));
const sinceMs = flags.since ? Date.parse(`${flags.since}T00:00:00Z`) : 0;
if (flags.since && Number.isNaN(sinceMs)) throw new Error(`--since must be YYYY-MM-DD, got ${flags.since}`);

// fxtwitter answers some calls with a one-off 404; retry those a few times.
async function getJson(url, { tries = 3, retryOn = [404, 429, 500, 502, 503] } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20000) });
      if (res.ok) return await res.json();
      last = `HTTP ${res.status}`;
      if (!retryOn.includes(res.status)) break;
    } catch (err) {
      last = err.cause?.code || err.name;
    }
    await sleep(1000 * (i + 1));
  }
  throw new Error(last);
}

const fxPost = (t, via) => ({
  platform: 'x',
  url: t.url,
  date: new Date(t.created_timestamp * 1000).toISOString(),
  author: t.author?.screen_name,
  via,
  repost: Boolean(t.reposted_by),
  likes: t.likes ?? null,
  text: t.text,
});

async function timelines() {
  const handles = flags.handles
    ? String(flags.handles).split(',').map((h) => h.trim()).filter(Boolean)
    : JSON.parse(fs.readFileSync(path.join(here, 'x-handles.json'), 'utf8')).handles;
  const maxPages = Number(flags.pages ?? 10);
  let ok = 0;
  for (const h of handles) {
    const seen = new Set();
    let cursor = null;
    let page = 0;
    let reached = false;
    try {
      // Page back with the bottom cursor until a page reaches past --since, or --pages runs out.
      for (; page < maxPages; page++) {
        const url = `https://api.fxtwitter.com/2/profile/${encodeURIComponent(h)}/statuses?count=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
        const j = await getJson(url);
        const results = j.results ?? [];
        for (const t of results) {
          if (seen.has(t.id)) continue;
          seen.add(t.id);
          if (t.created_timestamp * 1000 >= sinceMs) emit(fxPost(t, h));
        }
        // The last result is the oldest; a pinned post at the top can be older than the rest.
        const oldest = (results.at(-1)?.created_timestamp ?? 0) * 1000;
        cursor = j.cursor?.bottom;
        if (!results.length || !cursor || oldest < sinceMs) { reached = true; break; }
        await sleep(300);
      }
      ok++;
      if (!reached) gap(`fxtwitter timeline @${h}`, `stopped after ${maxPages} pages before reaching ${flags.since}`);
    } catch (err) {
      gap(`fxtwitter timeline @${h}`, `${err.message} on page ${page + 1}`);
    }
    await sleep(300);
  }
  return ok > 0;
}

function postId(s) {
  const m = String(s).match(/status\/(\d+)/) || String(s).match(/^(\d+)$/);
  if (!m) throw new Error(`not a post URL or id: ${s}`);
  return m[1];
}

const unescape = (s) => s.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

async function post() {
  let ok = 0;
  for (const a of args) {
    const id = postId(a);
    try {
      const j = await getJson(`https://api.fxtwitter.com/i/status/${id}`);
      emit(fxPost(j.tweet, 'fxtwitter'));
      ok++;
      continue;
    } catch (err) {
      gap(`fxtwitter status ${id}`, err.message);
    }
    try {
      const j = await getJson(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&token=a`, { tries: 2 });
      emit({
        platform: 'x',
        url: `https://x.com/${j.user?.screen_name}/status/${id}`,
        date: new Date(j.created_at).toISOString(),
        author: j.user?.screen_name,
        via: 'syndication',
        repost: false,
        likes: j.favorite_count ?? null,
        text: unescape(j.text ?? ''),
      });
      ok++;
    } catch (err) {
      gap(`syndication status ${id}`, err.message);
    }
  }
  return ok > 0;
}

// Paid route: the user's twitterapi.io script. Skipped (with a gap line) on any failure, such as 402.
function twitterSearch(query) {
  return new Promise((resolve) => {
    if (!fs.existsSync(TWITTER_SCRIPT)) { gap('twitterapi.io search', 'twitter-search script not found'); return resolve(false); }
    const q = flags.since && !/since:/.test(query) ? `${query} since:${flags.since}` : query;
    execFile(process.execPath, [TWITTER_SCRIPT, q, '--latest'], { timeout: 120000, maxBuffer: 1 << 24 }, (err, stdout, stderr) => {
      if (err) {
        const line = String(stderr).split('\n').find((l) => /^Error:/.test(l)) || err.message;
        gap('twitterapi.io search', line);
        return resolve(false);
      }
      for (const line of stdout.split('\n')) {
        if (!line.trim()) continue;
        try {
          const t = JSON.parse(line);
          emit({ platform: 'x', url: t.url, date: new Date(t.date).toISOString(), author: t.author, via: 'twitterapi.io', repost: false, likes: t.likes ?? t.likeCount ?? null, text: t.text });
        } catch { /* skip non-JSON lines */ }
      }
      resolve(true);
    });
  });
}

async function bskySearch(query) {
  const params = new URLSearchParams({ q: query, sort: 'latest', limit: '25' });
  if (flags.since) params.set('since', `${flags.since}T00:00:00Z`);
  try {
    const j = await getJson(`https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?${params}`, { tries: 2, retryOn: [429, 500, 502, 503] });
    for (const p of j.posts ?? []) {
      const rkey = p.uri.split('/').pop();
      emit({
        platform: 'bluesky',
        url: `https://bsky.app/profile/${p.author.handle}/post/${rkey}`,
        date: new Date(p.record?.createdAt ?? p.indexedAt).toISOString(),
        author: p.author.handle,
        via: 'bluesky search',
        repost: false,
        likes: p.likeCount ?? null,
        text: p.record?.text ?? '',
      });
    }
    return true;
  } catch (err) {
    gap('bluesky search', err.message);
    return false;
  }
}

async function search() {
  const query = args.join(' ');
  if (!query) throw new Error('search needs a query');
  const x = flags['no-x'] ? false : await twitterSearch(query);
  const b = flags['no-bsky'] ? false : await bskySearch(query.replace(/\b(since|until|min_faves|min_retweets|from|filter):\S+/g, '').replace(/-filter:\S+/g, '').trim());
  return x || b;
}

const commands = { timelines, post, search };
if (!commands[cmd]) {
  console.error('usage: x-signals.mjs timelines --since YYYY-MM-DD [--handles a,b] | post <url|id>... | search "<query>" --since YYYY-MM-DD');
  process.exitCode = 2;
} else {
  // Node 24 on Windows can assert if process.exit() runs right after fetch(); set exitCode instead.
  commands[cmd]().then((ok) => { if (!ok) process.exitCode = 1; }, (err) => { console.error(err.message); process.exitCode = 2; });
}
