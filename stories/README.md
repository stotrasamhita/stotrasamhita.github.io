# Stories (drafts)

Background stories for stotras, held here for review before they go on the
site. Nothing in this folder is published: the site shows only the stories in
`hugo/data/stories.yaml`.

- **`drafts.yaml`**: content path (as under `hugo/content/`, without `.md`) ->
  `text` (Markdown), `source` (where it came from), and optionally `notes`
  (research notes, caveats) and `links` (sources). `scripts/sync_vani.py`
  adds each new Vani video's YouTube blurb here; edited drafts are kept.
- **Approving**: move the entry to `hugo/data/stories.yaml` (just `text`, plus
  `source` if worth keeping). The page then shows it under "About this stotra".
