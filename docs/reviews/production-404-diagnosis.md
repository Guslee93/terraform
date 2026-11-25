# TF-VIS-001 — production 404s on `/studio/*` and `/about`: no longer reproduces

**Checked:** 2026-11-24 by Claude Opus 5.5, read-only, from outside Vercel (no dashboard access).
**Production URL:** `https://terraform-studio-murex.vercel.app`
**`origin/main`:** `2089fd4` (2026-11-15, PR #17). Nothing has been merged to `main` since, so
production is expected to serve that commit. Confirming which deployment the alias points at needs
the Vercel dashboard (owner).

## Evidence

| URL | Status | Content type | Body starts with |
|---|---|---|---|
| `/` | 200 | `text/html` | `<!doctype html>` |
| `/about` | 200 | `text/html` | `<!doctype html>` (the SPA rewrite serves the app) |
| `/studio/compact-infill` | 200 | `text/html` | `<!doctype html>` |
| `/sites/compact-infill/manifest.json` | 200 | `application/json` | `{ "schemaVersion": 1, "id": "compact-infill", …` (the real file, not the fallback) |

All four come from Vercel's cache (`x-vercel-cache: HIT`, ages from 5 hours to 30 hours).

## Finding

The symptom recorded in the feasibility study, 404s on deep links, does not reproduce. The app routes
get the SPA page and the static site files get their real content. The original cause was not
identified: production may have been redeployed or re-aliased since. The `fix/prod-404` worktree has no
commits beyond `main`. No fix is needed before PR #18; the acceptance check of TF-VIS-008 (these four
URLs return 200 after the merge) stays as written.
