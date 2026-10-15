#!/usr/bin/env python3
"""Adds the fields the site's browse and card layouts need to the generated
front matter under hugo/content/, after sync_content.py has regenerated it:

  iast    the title in IAST (pages with a Devanagari title and no iast yet)
  form    Aṣṭakam, Sahasranāma, Kavacam, ... inferred from the title (stotras)
  date    when the source .tex first entered stotra-sangrahah (stotras)
  deity   filled from the category folder when the TeX metadata has none

and turns TeX's dash ligatures (--- and --) into real dashes in titles and
body text, so feeds, link previews and search see what the pages show.

It also moves the stotras of the historical "big" category into their
deity's folder (REHOME), keeping the old /stotra/big/<slug>/ URL as an alias.

Idempotent: safe to run on content that has already been enriched.
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

from indic_transliteration import sanscript

REPO_ROOT = Path(__file__).resolve().parent.parent
CONTENT = REPO_ROOT / "hugo" / "content"

# stotra/big/<slug>.md -> stotra/<folder>/, with the deity it gets if its
# TeX metadata names none.
REHOME = {
    "gakaradi-ganapati-sahasranama-stotram": ("ganesha", "Ganesha"),
    "vakratunda-mahaganapati-sahasranama-stotram": ("ganesha", "Ganesha"),
    "kaishika-puranam": ("vishnu", "Vishnu"),
    "vishnu-sahasranama-stotram": ("vishnu", "Vishnu"),
    "lalita-trishati": ("shakti", "Shakti"),
    "saundarya-lahari": ("shakti", "Shakti"),
    "matribhuta-shatakam": ("shiva", "Shiva"),
    "shiva-sahasranama-stotram": ("shiva", "Shiva"),
    "shiva-sahasranama-stotram--vishnu-krtam": ("shiva", "Shiva"),
    "sankshepa-ramayanam": ("rama", "Rama"),
    "santanagopala-stotram": ("krishna", "Krishna"),
    "saraswati-sahasranama-stotram": ("saraswati", "Saraswati"),
    "surya-sahasranama-stotram": ("navagraha", "Surya"),
}

# Category folder -> deity, for stotras whose TeX metadata names none.
FOLDER_DEITY = {
    "shiva": "Shiva", "shakti": "Shakti", "krishna": "Krishna", "rama": "Rama",
    "venkatesha": "Venkatesha", "ganesha": "Ganesha", "saraswati": "Saraswati",
    "vishnu": "Vishnu", "subrahmanya": "Subrahmanya", "hanuman": "Hanuman",
    "lakshmi": "Lakshmi", "shasta": "Shasta", "navagraha": "Navagraha",
    "nadi": "Nadi", "guru": "Guru", "adhyatma-ramayana-stotras": "Rama",
}

# First match wins, so the more specific patterns come first.
FORMS = [
    ("सहस्रनाम", "Sahasranāma"), ("त्रिशती", "Triśatī"), ("अष्टोत्तर", "Śatanāma"), ("शतनाम", "Śatanāma"),
    ("अष्टक", "Aṣṭakam"), ("ष्टकम्", "Aṣṭakam"), ("पञ्चरत्न", "Pañcaratnam"), ("भुजङ्ग", "Bhujaṅgam"),
    ("कवच", "Kavacam"), ("सुप्रभात", "Suprabhātam"), ("ध्यान", "Dhyānam"), ("दण्डक", "Daṇḍakam"),
    ("गद्य", "Gadyam"), ("दशक", "Daśakam"), ("शतक", "Śatakam"), ("लहरी", "Laharī"), ("प्रातः", "Prātaḥsmaraṇam"),
    ("प्रार्थना", "Prārthanā"), ("स्तुति", "Stuti"), ("स्तव", "Stuti"), ("गीता", "Gītā"),
    ("उपदेश", "Upadeśa"), ("संवाद", "Saṃvāda"), ("सम्भाषण", "Saṃvāda"), ("नाम", "Nāma stotram"),
]

FRONT = re.compile(r"\A(\{\n.*?\n\})\n", re.S)
DEVANAGARI = re.compile(r"[ऀ-ॿ]")


def dashes(s, spaced=False):
    return s.replace("---", " — " if spaced else "—").replace("--", "–")


def body_dashes(body):
    """Dashes in text only: tags (ids, hrefs) keep their slugs' -- as is."""
    return "".join(p if p.startswith("<") else dashes(p) for p in re.split(r"(<[^>]*>)", body))


def iast(title):
    t = title.replace("---", " — ").replace("--", "–")
    t = sanscript.transliterate(re.sub(r"[()]", "", t), sanscript.DEVANAGARI, sanscript.IAST)
    t = re.sub(r"\s+", " ", t).strip()
    return " ".join(w[:1].upper() + w[1:] for w in t.split(" "))


def form_of(title):
    for pat, name in FORMS:
        if pat in title:
            return name
    return "Stotram"


def added_dates(repo):
    """Path -> date the file first appeared, following renames, in one pass
    over the history (oldest first)."""
    out = subprocess.run(
        ["git", "-C", str(repo), "log", "--reverse", "-M", "--name-status", "--format=>%as"],
        check=True, capture_output=True, text=True).stdout
    dates, day = {}, None
    for line in out.splitlines():
        if line.startswith(">"):
            day = line[1:]
        elif line:
            parts = line.split("\t")
            if parts[0] == "A":
                dates.setdefault(parts[1], day)
            elif parts[0].startswith("R"):
                dates[parts[2]] = dates.get(parts[1], day)
    return dates


def read(path):
    text = path.read_text(encoding="utf-8")
    m = FRONT.match(text)
    if not m:
        return None, text
    return json.loads(m.group(1)), text[m.end():]


def write(path, fm, body):
    path.write_text(json.dumps(fm, indent=1, ensure_ascii=False) + "\n" + body, encoding="utf-8")


def rehome():
    big = CONTENT / "stotra" / "big"
    if not big.is_dir():
        return
    for f in sorted(big.glob("*.md")):
        if f.name == "_index.md":
            continue
        slug = f.stem
        if slug not in REHOME:
            sys.exit(f"enrich_content: stotra/big/{f.name} has no REHOME entry")
        folder, deity = REHOME[slug]
        fm, body = read(f)
        fm["aliases"] = sorted(set(fm.get("aliases", [])) | {f"/stotra/big/{slug}/"})
        if not fm.get("deity"):
            fm["deity"] = [deity]
        dst = CONTENT / "stotra" / folder / f.name
        if dst.exists():
            sys.exit(f"enrich_content: {dst} already exists")
        write(dst, fm, body)
        f.unlink()
    for f in big.iterdir():
        f.unlink()
    big.rmdir()


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--stotra-repo", type=Path, help="clone of stotra-sangrahah with full history, for dates")
    args = ap.parse_args()

    rehome()
    dates = added_dates(args.stotra_repo) if args.stotra_repo else {}
    n = 0
    for f in sorted(CONTENT.rglob("*.md")):
        fm, body = read(f)
        if fm is None:
            continue
        before, before_body = dict(fm), body
        if "title" in fm:
            fm["title"] = dashes(fm["title"], spaced=True)
        body = body_dashes(body)
        title = fm.get("title", "")
        if DEVANAGARI.search(title) and "iast" not in fm:
            fm["iast"] = iast(title)
        rel = f.relative_to(CONTENT).parts
        if rel[0] == "stotra" and f.name != "_index.md":
            fm["form"] = form_of(title)
            if not fm.get("deity") and rel[1] in FOLDER_DEITY:
                fm["deity"] = [FOLDER_DEITY[rel[1]]]
            src = "stotras/" + fm.get("source_file", "").removeprefix("stotras/")
            if src in dates:
                fm["date"] = dates[src]
        if fm != before or body != before_body:
            write(f, fm, body)
            n += 1
    print(f"enriched {n} pages", file=sys.stderr)


if __name__ == "__main__":
    main()
