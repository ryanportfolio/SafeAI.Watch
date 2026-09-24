# Commands

> Build / dev / test / deploy commands for this project.

| Command | Does |
|---|---|
| `npm run dev` | Astro dev server with HMR |
| `npm run build` | Static build to `dist/` |
| `npm run preview` | Serve `dist/` locally; use this for browser checks |
| `npm run brand` | Regenerate favicons, app icons, `site.webmanifest`, `og-image.png` and the Newsreader italic subset (`src/assets/fonts/`) from `scripts/brand/build-brand.mjs`. Reads colours from `src/styles/tokens.css`; prints a sha256 prefix per file. Deterministic: two runs give identical hashes while the font packages and the pinned `sharp` stay on the same versions. Run it after changing the paper/ink/mark tokens, the brand geometry, or the italic glyph list, and commit the outputs. |

Browser checks run headed (see CLAUDE.md "Verification"). Pick a port other than 8905, which the local prototype uses.
