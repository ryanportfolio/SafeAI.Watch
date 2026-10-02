# Commands

> Build / dev / test / deploy commands for this project.

| Command | Does |
|---|---|
| `npm run dev` | Astro dev server with HMR |
| `npm run build` | Static build to `dist/`. Runs `npm run film:lint` first (the `prebuild` script), so a lint failure stops the build |
| `npm run preview` | Serve `dist/` locally; use this for browser checks |
| `npm run film:lint` | Runs `scripts/film/lint-beats.mjs`: checks the About film's captions in `film/beats.json` against `film/facts.md` and `film/SCRIPT.md` (timing, reading time, a source row for every string, quotes exact to their source, italic runs, no em dashes or display periods, every string in the script). Exits 1 on any failure; unsourced numbers only warn |
| `npm run brand` | Regenerate the logo SVGs (`src/assets/brand/`), favicons, app icons, `site.webmanifest`, `og-image.png` and the Newsreader italic subset (`src/assets/fonts/`) from `scripts/brand/build-brand.mjs`; the mark geometry is in `scripts/brand/valley.mjs`. Reads colours from `src/styles/tokens.css`; prints a sha256 prefix per file. Deterministic: two runs give identical hashes while the font packages and the pinned `sharp` stay on the same versions. Run it after changing the paper/ink/cream/accent-orange tokens, the brand geometry, or the italic glyph list, and commit the outputs. |

CI: `.github/workflows/ci.yml` runs on pull requests and pushes to `main`. Job Node: `npm ci`, then `npm run build` (which runs `film:lint`). Job Firmware: `node .claude/scripts/sync-codex-skills.mjs --check`. The file came from `node .claude/scripts/write-ci-workflow.mjs --write`; edit it by hand, or rerun with `--write --force` to regenerate it.

Browser checks run headed (see CLAUDE.md "Verification"). Pick a port other than 8905, which the local prototype uses.
