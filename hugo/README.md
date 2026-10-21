# Hugo site

The whole site, built with [Hugo](https://gohugo.io/) (extended edition,
version pinned in `.github/workflows/pages.yml`) and a theme of its own in
`layouts/`.

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
- **`about.md`**, **`major-books.md`** (Books), **`individual-pdfs.md`** (All
  PDFs) and **`panchangam.md`** (a redirect to Adyatithi): hand-written pages.

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
- `layouts/books.html`: the Books page, from `data/books.json`.
- `layouts/pdfs.html`: every PDF on one page. Stotras, nāmāvalīs and pūjās
  come from the pages themselves (`_partials/pdfs.html`; pūjā PDFs from
  `data/puja_pdfs.json`, which `sync_content.py` writes); the veda texts,
  which have no pages yet, from `data/veda_pdfs.json`.
- `data/vani.yaml`: each page's Stotra Samhita Vani video, written by
  `scripts/sync_vani.py`. The video plays in the page's info box (or under
  the heading of a chapter), and its title slide becomes the card thumbnail.
- `data/stories.yaml`: approved background stories, shown under "About this
  stotra" (`_partials/story.html`). Drafts wait in `../stories/drafts.yaml`.
- `assets/js/script-switcher.js`: the script picker in the masthead (and the
  bar above each text). The whole page, search hint included, is shown in
  the chosen script, kept across pages; the search boxes accept a query
  typed in any of them. Sanscript and the script's fonts load only when a
  script other than Devanagari is chosen.
- `assets/css/site.css`: the design; `assets/css/stotras.css`: verse layout.

## Covers

A stotra's cover is `assets/covers/<slug>.webp` if it exists. Otherwise, while
`params.placeholderCovers` is on, a public-domain Ravi Varma painting from
`assets/covers/placeholder/` stands in for the few stotras listed in
`data/placeholder_covers.yaml`. Next comes the title slide of its Vani video
(the YouTube thumbnail), and every other stotra gets a typographic cover in
its deity's colours. The info box on a stotra page shows the video, or else
the cover painting or its deity's painting.
