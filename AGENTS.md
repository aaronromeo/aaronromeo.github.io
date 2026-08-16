# AGENTS.md

Personal blog (aaronromeo.com) built with Hugo. No JS toolchain, no tests, no package.json — Hugo is the only tool.

## Commands
- Use `/usr/local/bin/hugo` — bare `hugo` resolves to an asdf shim with no version set and fails.
- Dev server with drafts: `/usr/local/bin/hugo server -D`
- Production build (matches CI): `/usr/local/bin/hugo --gc --minify` → `public/`
- This is the only verification step; there is no lint or test suite.

## Deploy
- Push to `master` (not `main`) triggers `.github/workflows/hugo.yml` → GitHub Pages.
- CI pins Hugo **0.120.0 extended**; local is 0.153.x. If a template works locally but the deploy build fails, suspect version drift first.
- Posts with `draft: true` are excluded from deploys; they only render under `hugo server -D`.

## Content conventions
- Posts are page bundles: `content/posts/YYYY-MM-DD-slug/index.md` with cover images in the same directory.
- Post frontmatter is YAML (`---`) even though `archetypes/default.md` is TOML (`+++`) — follow existing posts, not the archetype.
- Raw HTML is allowed in markdown (`markup.goldmark.renderer.unsafe = true`).

## Theme
- `themes/casper/` is a local in-repo port of Ghost's Casper theme — not a submodule or external dependency. Edit templates in place under `themes/casper/layouts/`.
- `MIGRATION_CHECKLIST.md` is a completed Middleman→Hugo migration record; treat as history, not a todo list.

## Working agreements
- Start in plan mode for new tasks; execute only after the plan is approved.
- Require explicit permission before running commands that modify the file system.
- After any file-system modification, verify by reading the file or checking directory state; report failures immediately.
- Be concise and follow existing conventions.
