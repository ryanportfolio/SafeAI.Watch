# Third-party licences

Fonts are self-hosted: npm packages bundle the woff2 files into `dist/_astro/` at build time. No font CDN. The OFL texts below also ship with the site as `/licenses/<file>.txt` (`src/pages/licenses/[file].txt.ts` publishes this folder), linked from the About page. The Newsreader italic is a subset made by `npm run brand` (lowercase, weight 400); OFL 1.1 permits this and Newsreader declares no Reserved Font Name.

| Font | Use | Licence | Source | npm package |
|---|---|---|---|---|
| Geist | body, UI (`--font-sans`) | SIL OFL 1.1, [OFL-Geist.txt](OFL-Geist.txt) | vercel/geist-font | `@fontsource-variable/geist` |
| Geist Mono | uppercase labels (`--font-mono`) | SIL OFL 1.1, [OFL-Geist-Mono.txt](OFL-Geist-Mono.txt) | vercel/geist-font | `@fontsource-variable/geist-mono` |
| Newsreader | headlines, serif leads (`--font-serif`) | SIL OFL 1.1, [OFL-Newsreader.txt](OFL-Newsreader.txt) | productiontype/Newsreader | `@fontsource-variable/newsreader` (opsz + wght axes) |

The prototype's headline face, Klim's Signifier, is commercial and not licensed here. Newsreader stands in for it. To switch to a licensed Signifier later, self-host its files, add the `@font-face` rules, and change `--font-serif` in `src/styles/tokens.css`. Nothing else references the serif by name.
