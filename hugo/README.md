# Hugo site

The site's homepage and all of its content sections, built with
[Hugo](https://gohugo.io/) (extended edition, version pinned in
`.github/workflows/pages.yml`) and a theme of its own in `layouts/`. A few
older root-level pages (`about/`, `major-books/`, `individual-pdfs/`) still
come from the Jekyll site at the repo root; see the [root README](../README.md).

Run locally from inside this `hugo/` directory:

```
hugo server
```

## Content (`content/`)

Generated from the TeX corpora by `scripts/sync_content.py` and then
`scripts/enrich_content.py`; don't edit generated pages by hand. Each
section's own `_index.md` is hand-written and kept across syncs.

- **`stotra/`**: stotras by category (mostly deity), e.g. `stotra/lakshmi/`.
  `/stotra/` itself is the browse page, with filters for deity, form,
  composer, metre and length (`?deity=Śiva&form=Aṣṭakam`).
- **`namavali/`**: nāmāvalīs, grouped by length (`100`, `300`, `1000`, `small`).
- **`puja-vidhanam/`**: pūjās and vratas; multi-part ones are subdirectories.
- **`gita/`**, **`adhyatma-ramayanam/`**, **`mahabharatam/`**: whole texts,
  split into chapters.

`enrich_content.py` adds the IAST title, form, date added and missing deity
to each page's front matter, and moves the old `stotra/big/` stotras into
their deity's folder, keeping the old URL as an alias.

## Theme

- `layouts/home.html`: the magazine front page. What it features (lead
  stotra, featured stotras, collections, books, day-of-week deities) is set
  in `data/home.yaml`.
- `layouts/browse.html`: `/stotra/`. Cards are rendered here; `assets/js/browse.js`
  filters and sorts them in the browser.
- `layouts/section.html`, `layouts/page.html`: section listings and reading pages.
- `data/deities.yaml`, `composers.yaml`, `meters.yaml`: display names (with
  diacritics) for the raw TeX metadata, and each deity's cover colours.
- `assets/css/site.css`: the design; `assets/css/stotras.css`: verse layout.

## Covers

A stotra's cover is `assets/covers/<slug>.webp` if it exists. Otherwise, while
`params.placeholderCovers` is on, a public-domain Ravi Varma painting from
`assets/covers/placeholder/` stands in for the few stotras listed in
`data/placeholder_covers.yaml`. Every other stotra gets a typographic cover
in its deity's colours.
