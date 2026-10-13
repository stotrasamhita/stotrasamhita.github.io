# stotrasamhita.github.io

Source for **[stotrasamhita.github.io](https://stotrasamhita.github.io/)**: stotras, nāmāvalīs, pūjā-vidhānas and longer texts (the Gītā, the Adhyātma Rāmāyaṇa, the Mahābhārata's Virāṭa Parva), readable in several scripts, with their PDFs. The texts themselves live in sibling repos under the [StotraSamhita org](https://github.com/stotrasamhita); this repo is the website.

The site is one [Hugo](https://gohugo.io/) site in `hugo/`, with its own theme. See [`hugo/README.md`](hugo/README.md) for how it is laid out and how to run it.

## How content gets here

- **`scripts/sync_content.py`** regenerates `hugo/content/` from the sibling repos (via stotra-sangrahah's TeX-to-HTML scripts), then runs **`scripts/enrich_content.py`**, which adds the IAST title, form, date added and missing deities. The **Sync content** workflow runs this daily and commits any changes.
- **`scripts/sync_vani.py`** writes `hugo/data/vani.yaml`: the [Stotra Samhita Vani](https://www.youtube.com/@stotrasamhita-vani) video for each page, and adds each video's blurb to `stories/drafts.yaml` for review. It reads the upload list kept locally in the vani repo, so run it by hand after new uploads:

  ```
  python3 scripts/sync_vani.py --vani ../vani
  ```

## Stories

Background stories wait in `stories/drafts.yaml` until reviewed; only those moved to `hugo/data/stories.yaml` appear on the site. See [`stories/README.md`](stories/README.md).

## Deploying

`.github/workflows/pages.yml` builds `hugo/` and deploys it to GitHub Pages on every push to `master`.

The site used to be Jekyll (minimal-mistakes) at the root plus hugo-book for the texts. All of it is Hugo now, and the old addresses still work: `/about/`, `/major-books/`, `/individual-pdfs/`, `/projects/` (now part of About), `/panchangam/` (redirects to [Adyatithi](https://adyatithi.github.io/)), and the old section paths `/stotras/`, `/namavalis/`, `/pujavidhanam/`.

---

*The README.md files on this repo were generated and beautified with Claude.*
