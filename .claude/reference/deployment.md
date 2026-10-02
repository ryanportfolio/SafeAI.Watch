# Deployment

> Deploy target, build output, asset paths, publish flow.

- Target: Vercel. The project is linked and Git-connected: a push to `main` creates a Production deployment, a PR gets a Preview deployment, and Vercel reports back as GitHub commit statuses with context `Vercel`.
- Domains: https://safeai.watch/ and https://www.safeai.watch/ serve the site from Vercel (`Server: Vercel`). The project's Vercel URL https://safeai-watch.vercel.app/ serves it too. `astro.config.mjs` sets `site: 'https://safeai.watch'`.
- Build: Astro static, `npm run build` → `dist/`. Vercel detects Astro with no extra config.
- No database, no secrets yet.
- CI: `.github/workflows/ci.yml` builds the site and checks Codex skill sync on every PR and push to `main` (see `commands.md`). It is separate from the Vercel deploy.
