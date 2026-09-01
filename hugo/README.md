# Hugo site

A self-contained [Hugo](https://gohugo.io/) site, using the [hugo-book](https://github.com/alex-shpak/hugo-book) theme (a git submodule at `themes/hugo-book` — run `git submodule update --init --recursive` from the repo root if it's empty). See the [root README](../README.md) for how this fits together with the Jekyll site at the repo root: this Hugo build only supplies specific content sections (`stotras/`, `namavalis/`, `pujavidhanam/`, `mahabharatam/`, `gita/`, `adhyatma-ramayanam/`), not the site's homepage or root-level pages.

Run locally with:

```
hugo server
```

(run from inside this `hugo/` directory; requires the extended edition of Hugo, matching the version pinned in `.github/workflows/pages.yml`).

## Content layout (`content/`)

Each top-level directory under `content/` is a section, with an `_index.md` giving it a title/landing page:

- **`stotras/`** — stotras (hymns), organized by subject/deity (e.g. `dhyanam/`, `hanuman/`).
- **`namavalis/`** — nāmāvalis (name-lists), grouped by length (`100`, `300`, `1000`) plus a `small/` set.
- **`pujavidhanam/`** — pūjā-vidhānam (ritual procedure texts) — individual pujas (e.g. `ganga-puja.md`, `surya-puja.md`), vratams, tarpaṇams, and māhātmyams, both as flat `.md` files and as subdirectories for multi-page procedures.
- **`mahabharatam/`** — Mahābhāratam content, organized by parva (e.g. `04-virāṭaparva/`).
- **`gita/`** — the Bhagavad Gītā and related texts (Gītā Sāra, māhātmyams).
- **`adhyatma-ramayanam/`** — Adhyātma Rāmāyaṇam, organized by kāṇḍa (bala, ayodhya, aranya, kishkindha, sundara, yuddha, uttara).

`content/_index.md` itself is a stub — it's not served as a page; it just documents (for anyone browsing the source) that the real homepage lives in the Jekyll site at the repo root.

## Other directories

- **`assets/`** — CSS/JS built through Hugo's asset pipeline (`assets/css/stotras.css`, `assets/js/sanscript.js` for script transliteration, `assets/js/script-switcher.js`).
- **`layouts/`** — custom layout overrides on top of the hugo-book theme.
- **`static/`** — files served as-is (e.g. `logo.png`).
- **`themes/hugo-book/`** — the theme, as a git submodule; don't edit in place, it will be overwritten on submodule update.

`public/`, `resources/`, and `.hugo_build.lock` are Hugo build artifacts and are gitignored.
