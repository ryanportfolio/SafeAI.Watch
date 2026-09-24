# Deployment

> Deploy target, build output, asset paths, publish flow.

- Target: Vercel, Git-connected (preview per PR, production from `main`). Project not linked yet.
- Domain: safeai.watch (DNS not configured yet; user action).
- Build: Astro static, `npm run build` → `dist/`. Vercel detects Astro with no extra config.
