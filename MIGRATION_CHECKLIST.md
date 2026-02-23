# Migration Checklist: Middleman → Hugo

## Phase 1: Hugo Project Setup
- [x] Initialize Hugo site (`hugo new site . --force`)
- [x] Create `hugo.toml` with site configuration
- [x] Create `.gitignore` for Hugo
- [x] Create `theme.toml` for theme metadata

## Phase 2: Theme Structure
- [x] Create `layouts/_default/baseof.html`
- [x] Create `layouts/_default/list.html` (homepage)
- [x] Create `layouts/_default/single.html` (posts)
- [x] Create `layouts/_default/taxonomy.html` (tags list)
- [x] Create `layouts/_default/term.html` (individual tag)
- [x] Create `layouts/page/author.html`
- [x] Create `layouts/partials/head.html`
- [x] Create `layouts/partials/header.html`
- [x] Create `layouts/partials/footer.html`
- [x] Create `layouts/partials/nav.html`
- [x] Create `layouts/partials/post-meta.html`
- [x] Create `layouts/partials/share.html`
- [x] Create `layouts/partials/read-next.html`
- [x] Create `layouts/partials/pagination.html`
- [x] Create `layouts/_default/rss.xml`

## Phase 3: Static Assets
- [x] Copy fonts to `/static/fonts/`
- [x] Copy images to `/static/images/`
- [x] Convert casper.css → `/static/css/casper.css` (update Font Awesome icons)
- [x] Create `/static/js/nav.js` (vanilla JS nav toggle)
- [x] Add Font Awesome CDN to base template
- [x] Remove jQuery references

## Phase 4: Content Migration
- [x] Create `/content/posts/` directory
- [x] Migrate: `2014-05-04-storing-images-on-s3-with-django.html.markdown`
- [x] Migrate: `2017-11-12-jest-snapshots-with-webpacker.html.markdown`
- [x] Migrate: `2017-11-18-managing-localhost-states.html.markdown`
- [x] Migrate: `2019-06-06-analysis-using-materialized-views-in-rails-and-postgresql.html.markdown`
- [x] Migrate: `2019-11-11-caching-with-rollups.html.markdown`
- [x] Migrate: `2024-01-01-pyrfid-jubebox.md`
- [x] Create page bundles with cover images for each post
- [x] Convert frontmatter (arrays for tags/categories, draft flag)

## Phase 5: Features
- [x] Configure Disqus integration
- [x] Set up pagination (6 posts/page)
- [x] Create author page with Gravatar
- [x] Implement social sharing (Twitter, Facebook only)
- [x] Implement prev/next navigation
- [x] Test RSS feed output
- [x] Test tag pages and feeds

## Phase 6: GitHub Actions Deployment
- [x] Create `.github/workflows/hugo.yml`
- [x] Configure Hugo version in workflow
- [x] Set up `gh-pages` branch deployment
- [x] Test build locally (`hugo` command)
- [ ] Push and verify deployment

## Phase 7: Verification
- [ ] Verify all 6 posts render correctly
- [ ] Verify homepage pagination
- [ ] Verify tag pages work
- [ ] Verify author page displays
- [ ] Verify RSS feed validates
- [ ] Verify Disqus loads on posts
- [ ] Verify social share buttons work
- [ ] Verify responsive design (mobile/tablet)
- [ ] Verify syntax highlighting works
- [ ] Verify navigation menu toggles
- [x] Remove old Middleman files (Gemfile, config.rb, source/, helpers/)
