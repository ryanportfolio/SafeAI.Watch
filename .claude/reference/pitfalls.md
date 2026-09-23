# Pitfalls

> Accumulated project-specific gotchas. Dated entries, newest at the bottom. If this file exceeds ~200 lines, split by area (`pitfalls-<area>.md`) and update the CLAUDE.md index.

## Starter safety

This starter must not ship maintainer-only checkout paths, private workflow
rules, secrets, or local-machine assumptions. Put those in untracked personal
instructions or in a private fork-specific memory file instead.

Worktree changes are isolated. Before claiming a template change is available
somewhere else, verify the exact branch or checkout the user asked about. Do not
merge, pull into another checkout, or touch paths outside the current workspace
unless the user explicitly asks in the current session.

## Local preview servers: stale or wrong site (2026-07-18)

Symptom: opening a local dev/preview server shows an outdated version of the
site, or a completely different project.

Root causes:

1. **Server reuse on a busy port.** Preview tooling (and manual servers) reuse
   whatever is already bound to the port. A server left over from a prior
   session serves old code; a different project on a shared default port
   (3000/5173/8080) serves the wrong site entirely.
2. **Worktree mismatch.** Server launched from the main checkout while edits
   live in a git worktree (or the reverse) — edits never appear no matter how
   often the page reloads.
3. **Stale build output.** Serving `dist/`/`build/` without rebuilding after
   source edits.
4. **Browser cache / service worker.** Old assets persist even after the
   server itself is current.

Prevention protocol (run every time before trusting a preview):

1. Before starting: check the port (`netstat -ano | findstr :<port>` on
   Windows, `lsof -i :<port>` on Unix). Port busy → inspect the owning PID's
   command line and cwd; if they don't match the current checkout, kill it or
   start on a fresh unique port. Never assume a reused server is the right one.
2. After loading: **sentinel check** — verify the page contains a string unique
   to the change just made (via page-text extraction, not a screenshot glance).
   No sentinel visible → server is stale or wrong; stop and diagnose before
   claiming anything works.
3. Static builds: rebuild before serving; confirm output mtime is newer than
   the edited sources.
4. Staleness persists after 1–2 → hard reload, unregister service workers, or
   use a fresh browser profile.

## Cross-cutting engineering gotchas (2026-08-18, from cursor-team-kit review)

1. **History rewrites: tree-hash check.** Before any agreed rebase/squash of a
   pushed branch, capture `ORIGINAL_TREE=$(git rev-parse origin/<branch>^{tree})`;
   after rewriting, compare with `git rev-parse HEAD^{tree}`. Do not push if the
   tree changed unintentionally — the rewrite was supposed to reshape history,
   not content.
2. **JSON embedded in `<script>` tags.** `JSON.stringify`/`json.dumps` output is
   not HTML-safe: a `</script>` inside a string terminates the tag early. Escape
   `<`, `>`, `&` as `\u003c`, `\u003e`, `\u0026` before embedding.
3. **Backgrounded dev servers: fixed port.** Background shells have no TTY, so
   server startup messages can sit buffered and unread — with port 0
   (auto-assign) you can never learn which port was chosen. Always pass an
   explicit port to servers started in the background.

## Headed Chrome steals the screen unless you place it (2026-08-23)

Visual verification runs headed on the real GPU, and a plain
`chromium.launch({ headless: false, channel: "chrome" })` drops that window on
top of whatever the operator is doing and takes the keyboard with it.

Minimizing does not solve it. Measured on Windows 10 with two displays: a window
minimized through CDP (`Browser.setWindowBounds`, `windowState: "minimized"`)
loses its compositor surface and requestAnimationFrame throttles to **1 Hz**,
with or without `--disable-features=CalculateNativeWinOcclusion`. Screenshots
still return fresh pixels at 1 Hz, so a static DOM check passes while every
frame timing, scroll narrative and animation reading is garbage.

Fix: `scripts/lib/launch-chrome.mjs` -> `launchPlacedChrome()`. It places the
window on a display that is not holding the foreground window, then hands the
foreground back to the window that had it. `CHROME_PLACE` picks the mode:
`other-monitor` (default), `offscreen` (parked at -2400,-2400, rendered but
never visible, and the fallback when only one display is attached), or `here`.
Both placed modes held 100.5 fps on a 100 Hz panel, same as an unplaced window.

Notes: `--window-position` applies to the first window of a launch, so one
launch per run. Placement is Windows-only and degrades to a plain headed launch
elsewhere. The DIP-to-pixel mapping assumes both displays share a scale factor.

## Playwright MCP plugin browser is a single shared instance (2026-08-29)

The official playwright plugin launches `npx @playwright/mcp@latest` with a
persistent profile. Two MCP server processes (a main session plus a subagent
with its own connection) cannot share that profile: the second gets
"Browser is already in use ... use --isolated" and blocks. Observed as a
~10-minute deadlock between a verifier subagent and its main session.

Fixes: the template ships `.mcp.json` defining `playwright-iso`
(`@playwright/mcp@latest --isolated`, in-memory profile, N concurrent agents);
or drive an independent Chrome via a repo-local `playwright-core` +
`scripts/lib/launch-chrome.mjs`. Never point a verifier subagent and the main
session at the shared plugin browser at the same time.

Same shape, different tool (2026-09-09): the desktop app's Browser pane
(`mcp__Claude_Browser__*`, `preview_start`) is one Chrome per app. A second
session or subagent asking for it gets "Another task's Chrome owns browser
slot". `--isolated` does not apply there; that string comes from the app, not
from this repo. Use `playwright-iso` or `launchPlacedChrome()` instead.

## Bash tool cwd resets between calls (2026-08-29)

The shell tool's working directory does not reliably persist across calls; it
intermittently resets to the parent workspace directory. Symptoms observed:
`npx tsc` resolving the dummy "not the tsc command you are looking for"
package from the wrong directory, and `git add` failing with "fatal: not a git
repository". Start compound commands with `cd <repo> &&` or use `git -C`.

## README panels embed repo metrics (2026-09-16, amended 2026-09-19)

`assets/readme/skills-*.svg` print the total on-demand skill size and
`assets/readme/boot-*.svg` print the always-loaded context weight, so an edit to any
`SKILL.md`, to `CLAUDE.md`, to `skillOverrides` in `.claude/settings.json`, or to the
`.claude/reference/` file set makes them stale and
`scripts/readme/verify.mjs` fails CI on main. Run `node scripts/readme/build.mjs` before
opening a PR that touches those paths, and commit only the panels whose content changed
(autocrlf marks the rest modified). `gh pr merge` does not block on a red check here (no
required checks), so read `gh pr checks <n>` before merging; #132 landed red this way.
Same root cause: `node .claude/scripts/check-skill-capabilities.mjs` reports "Capability
catalog stale" on a CRLF checkout while CI (LF) passes; `--write` then produces a
line-ending-only diff. Trust CI for that check, not the local run.
Adding or removing a skill also breaks the pinned counts: `requiredCounts` in
`scripts/readme/facts.mjs` and three `skillCount`/`tierCounts` assertions in
`scripts/readme/readme.test.mjs` (the fixture there copies every skill into both runtimes,
so its Codex count equals the Claude count). `build.mjs` throws until they match.

## Bash tool collapses doubled backslashes in heredocs (2026-09-19)

Text sent through the Bash tool loses one level of backslash escaping before the shell
sees it, even inside a quoted `<<'EOF'` heredoc: a Python literal `'a\\nb'` arrives as
`'a\nb'` (length 3, real newline). Writing JavaScript that must contain `"\n"` through a
Python heredoc therefore produced a string literal split across two lines and a
SyntaxError; a second heredoc "fix" did the same thing. Write files that need literal
backslash sequences with the Edit or Write tool, or keep the sequence out of the command
text (read it from a file).

## Astro drops the space at a line break before an inline element (2026-09-22)

In `.astro` markup, prose that wraps onto a new line directly before an inline element (`<a>`, `<time>`) or directly after one loses the space: `through\n<time>` builds as `through<time>`, rendering "through18 September". Keep the element on the same line as its neighbouring words, or write `{' '}` at the break. Check built pages by scanning `main.innerText` for `[a-z][0-9]` and `[a-z.,][A-Z][a-z]`.

## Built CSS shortens hex tokens (2026-09-22)

The build minifies custom property values: `--accent-orange: #ff7733` reaches the browser as `#f73`. Script that reads a token with `getComputedStyle(el).getPropertyValue(...)` and parses it as six-digit hex gets garbage (orange rendered dark blue in the hero scene). Parse three-digit hex too; `rgb()` in `src/scripts/visuals/shapes.ts` does.

## Overriding `position: sticky` keeps its `top` (2026-09-22)

A media query that turns a sticky element back into `position: relative` still applies the inherited `top: 128px`, now as a relative offset: the step cards below 1024px sat 128px lower than their box, so the last card overlapped the next section. Reset `top: auto` wherever sticky is switched off.

## Playwright init scripts stack on a reused page (2026-09-22)

`page.addInitScript` registrations persist for the page's lifetime. Running the same `browser_run_code_unsafe` check twice on one `playwright-iso` page wrapped `WebGL2RenderingContext.prototype.clear` twice, doubling the frame count (600 frames in 3 s, median interval 0.1 ms). Call `browser_close` before rerunning a check that installs init scripts, or guard the script with a window flag.

## fontkit cannot apply variations to a WOFF2 (2026-09-22)

`fontkit.create(woff2).getVariation({ wght: 500 })` builds a plain TTF reader over the WOFF2 stream and throws `Cannot read properties of undefined (reading 'tables')` on the first glyph lookup; setting `variationCoords` by hand fails later in `_getPhantomPoints`. Astro's bundled `fontkitten` has the same cmap bug and no GPOS, so its outlines lack kerning (Geist "SafeAI.watch" is 3.5% wider unkerned). Decompress to TTF with `wawoff2` first, then `getVariation`: `scripts/brand/build-brand.mjs` does this and its layout matches the browser (nav name 96.14px measured, 96.13px computed).

## Line endings vary per file (2026-09-23)

Files under `src/` do not share one line ending: some tools wrote CRLF, others LF (on 2026-09-23 `index.astro`, `sequence.ts`, `SectionJump.astro`, `Timeline.astro` were LF after edits that had assumed CRLF). A Node or sed script that replaces a multi-line needle finds nothing when the needle's endings differ from the file's (cost retries). Check first (`grep -c $'' <file>`), match the file's endings, or use the Edit tool. The Edit tool is itself one source of the drift: on 2026-09-23 one Edit turned all-CRLF `SectionJump.astro` (315/315 lines) and `index.astro` (1416/1416) into all-LF, so a CRLF needle chosen from a count taken before the edit missed. Recount after any Edit.

## Font preload warnings on every navigation after the first (2026-09-23)

Chrome logged "preloaded using link preload but not used within a few seconds" for both preloaded fonts on every page after the first, with preload hrefs, `as`, `type` and `crossorigin` all matching the `@font-face` URLs. Disabling the HTTP cache did not help. Cause: Chrome reuses the parsed contents of an unchanged external stylesheet across same-origin navigations, including font sources it already loaded, so the new page never requests the font and its preload goes unclaimed. Moving the preloaded faces' `@font-face` rules into an inline `<style>` (parsed per document) gave 0 warnings; removing the preloads did too. `BaseLayout.astro` inlines them via `?inline` imports. Reproduce with one browser context walking all five routes twice, 4.5 s after each load; a fresh context per page never shows it.
