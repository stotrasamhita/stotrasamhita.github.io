# stotrasamhita.github.io

Source for **[stotrasamhita.net](https://stotrasamhita.net/)**, a wiki of Sanskrit stotras, namavalis, pūjā-vidhānam and related texts rendered in multiple Indian scripts. This repo is a GitHub Pages site — a codebase, not a text collection (the actual Sanskrit texts and their compiled PDFs live in sibling repos under the [StotraSamhita org](https://github.com/stotrasamhita), notably `stotra-sangrahah`, `vedamantra-book` and `Transliterated-PDFs`).

## Two site generators, one deployed site

This repo currently contains **two separate static-site setups that are both built and merged into the one live site**, not a case of one being abandoned in favor of the other. This is confirmed by `.github/workflows/pages.yml`, the GitHub Actions workflow that actually builds and deploys to GitHub Pages:

1. **Jekyll (repo root)** — a Jekyll/Octopress site (`_config.yml`, `_layouts/`, `_includes/`, `_sass/`, `_posts/`, `_data/`, `Gemfile`, `_octopress.yml`) using the [minimal-mistakes](https://github.com/mmistakes/minimal-mistakes) remote theme. It owns the site's **root-level pages**: the homepage (`index.md`), `about/`, `major-books/`, `panchangam/`, `posts/`, `projects/`, `theme-setup/`, `individual-pdfs/`, and `404.md`.
2. **Hugo (`hugo/`)** — a self-contained Hugo site (`hugo/hugo.toml`, `hugo/content/`, `hugo/layouts/`, `hugo/static/`) using the [hugo-book](https://github.com/alex-shpak/hugo-book) theme (a git submodule at `hugo/themes/hugo-book`). It owns specific **content sections** served under their own paths: `stotras/`, `namavalis/`, `pujavidhanam/`, `mahabharatam/`, `gita/`, and `adhyatma-ramayanam/`.

The workflow builds both independently — Jekyll via `actions/jekyll-build-pages`, Hugo via `hugo --minify` — then merges the two output trees, copying Jekyll's output in first and layering Hugo's output on top *without overwriting* (`cp -rn`). In practice this means: Jekyll owns the site root and its own pages, and Hugo populates the namespaced section paths that don't exist on the Jekyll side. Neither generator is "legacy" in the sense of being dead code — both are live and both ship to production on every push to `master`. (Whether this split is the long-term intended architecture or an in-progress migration toward one generator is not something the workflow file states either way — treat it as the current, working state rather than a final destination.)

### Running Jekyll locally

```
bundle install
bundle exec jekyll serve
```

Note: the committed `Gemfile.lock` pins old Jekyll/Bundler versions (Jekyll 2.5.3, Bundler 1.10.5) that predate the `remote_theme: mmistakes/minimal-mistakes` setting in `_config.yml` — building against that lockfile directly will silently drop the theme. The production build instead uses GitHub's `actions/jekyll-build-pages`, which builds with the same modern, theme-aware environment as GitHub's classic Pages builder regardless of the lockfile. If `bundle exec jekyll serve` doesn't render the theme correctly, that's why; you may need to update the Gemfile/lockfile for a faithful local preview.

### Running Hugo locally

```
git submodule update --init --recursive   # first time, to fetch hugo-book
cd hugo
hugo server
```

Requires a recent Hugo (extended edition; the workflow uses 0.165.0).

## `individual-pdfs/`

A Jekyll page (`individual-pdfs/index.md`) that links out to the individually-compiled PDF files (per-stotra, per-mantra, per-puja) produced by the sibling repos — `stotra-sangrahah`, `vedamantra-book`, and their multi-script variants in `Transliterated-PDFs`. It doesn't contain PDFs itself; it's an index page pointing at `raw.githubusercontent.com`-style links into those repos' compiled output. `major-books/` similarly links to the larger compiled books (Stotra Sangrahah, Veda Mantra Book, etc.) from those same repos.

## Other things to know

- **`.gitmodules`** points `hugo/themes/hugo-book` at [alex-shpak/hugo-book](https://github.com/alex-shpak/hugo-book) — run `git submodule update --init --recursive` after cloning or the Hugo theme will be missing.
- **`Gruntfile.js` / `.jshintrc` / `package.json`** are minimal-mistakes' original Grunt-based asset build (JS lint/minify, image minification) for the Jekyll side; unrelated to the Hugo build.
- **`_data/navigation.yml`** and **`_data/authors.yml`** are Jekyll data files (site nav, author metadata) consumed by the minimal-mistakes theme.

---

*The README.md files on this repo were generated and beautified with Claude.*
