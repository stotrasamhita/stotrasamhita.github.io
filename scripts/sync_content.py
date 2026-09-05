#!/usr/bin/env python3
"""Regenerates hugo/content/<section>/ for each source-repo corpus from its
latest upstream commit, skipping corpora whose HEAD SHA hasn't changed since
the last successful sync (tracked in .sync-state.json at the repo root).

Intended to run from a checkout of stotrasamhita.github.io, with each source
repo (stotra-sangrahah plus every corpus repo) already cloned/updated as a
sibling directory under --repos-dir. Used both by the daily
sync-content.yml GitHub Actions workflow and for local dry runs.

Exit code 0 with "changed: <n>" on stdout when regeneration produced any
content diff (the workflow commits+pushes on this); 0 with "changed: 0" when
nothing needed regenerating; non-zero on any hard error (nothing is
committed either way -- git diffing hugo/content/ is what actually decides
whether there's something to push, not this exit code).
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
STATE_FILE = REPO_ROOT / ".sync-state.json"
HUGO_CONTENT = REPO_ROOT / "hugo" / "content"


def run(cmd, cwd=None):
    print("+", " ".join(str(c) for c in cmd), file=sys.stderr)
    return subprocess.run(cmd, cwd=cwd, check=True, capture_output=True, text=True)


def git_head_sha(repo_dir):
    return run(["git", "-C", str(repo_dir), "rev-parse", "HEAD"]).stdout.strip()


def load_state():
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    return {}


def save_state(state):
    STATE_FILE.write_text(json.dumps(state, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def humanize_slug(slug):
    return " ".join(w.capitalize() for w in slug.split("-"))


def sync_category_dir(fresh_root, content_dir, next_weight_start=10):
    """Copies fresh_root's per-category subdirectories (each holding
    tex_to_ir.py-derived .md files, one dir per category) into content_dir,
    preserving each category's existing hand-authored _index.md (title/
    weight/description curated by hand -- ir_to_hugo.py never writes these)
    and auto-creating a minimal placeholder for a genuinely new category
    that doesn't have one yet."""
    content_dir.mkdir(parents=True, exist_ok=True)
    existing_weights = []
    for cat_dir in content_dir.iterdir():
        if cat_dir.is_dir():
            idx = cat_dir / "_index.md"
            if idx.exists():
                m = re.search(r'"weight":\s*(\d+)', idx.read_text(encoding="utf-8"))
                if m:
                    existing_weights.append(int(m.group(1)))
    next_weight = (max(existing_weights) + 10) if existing_weights else next_weight_start

    new_categories = []
    for cat_src in sorted(fresh_root.iterdir()):
        if not cat_src.is_dir():
            continue
        cat_slug = cat_src.name
        cat_dst = content_dir / cat_slug
        preserved_index = None
        existing_index = cat_dst / "_index.md"
        if existing_index.exists():
            preserved_index = existing_index.read_text(encoding="utf-8")
        if cat_dst.exists():
            shutil.rmtree(cat_dst)
        shutil.copytree(cat_src, cat_dst)
        if preserved_index is not None:
            (cat_dst / "_index.md").write_text(preserved_index, encoding="utf-8")
        elif not (cat_dst / "_index.md").exists():
            placeholder = (
                json.dumps({"title": humanize_slug(cat_slug), "weight": next_weight, "bookCollapseSection": True}, indent=1, ensure_ascii=False)
                + "\n\n<p></p>\n"
            )
            (cat_dst / "_index.md").write_text(placeholder, encoding="utf-8")
            new_categories.append(cat_slug)
            next_weight += 10
    if new_categories:
        print(f"NOTE: new categories under {content_dir.relative_to(REPO_ROOT)} got a placeholder _index.md "
              f"(title/description need manual curation): {', '.join(new_categories)}", file=sys.stderr)


def sync_flat_dir(fresh_root, content_dir):
    """Replaces content_dir's entire tree with fresh_root's, except the
    section-root _index.md (hand-authored, sits outside anything
    ir_to_hugo.py generates so it's simply never copied over)."""
    content_dir.mkdir(parents=True, exist_ok=True)
    for entry in content_dir.iterdir():
        if entry.name == "_index.md":
            continue
        if entry.is_dir():
            shutil.rmtree(entry)
        else:
            entry.unlink()
    for entry in fresh_root.iterdir():
        dst = content_dir / entry.name
        if entry.is_dir():
            shutil.copytree(entry, dst)
        else:
            shutil.copy2(entry, dst)


def build_ir(tex_to_ir, files, out_dir, cwd, extra_args=()):
    # cwd MUST be the source repo's own root: tex_to_ir.py's \input{}
    # resolution (resolve_input()) reads relative paths (e.g. puja-vidhanam's
    # \input{pujas/MahaNyasah}) against the process's current working
    # directory, not anything derived from the .tex file's own path -- every
    # manual run this pipeline was developed against was `cd`'d into the
    # repo root first, and this has to match or kathas/purvanga \input{}s
    # silently fail to resolve (no error, just quietly less content, which
    # is what makes this easy to miss without the fix).
    #
    # File args are passed relative to that same cwd (not absolute), so the
    # IR's "source_file" field is a clean "pujas/ganga-puja.tex"-style path
    # (matching every manually-generated file already committed) rather
    # than one baked-in absolute checkout path that would differ run to
    # run and needlessly re-diff every regenerated file, changed content
    # or not.
    rel_files = [str(Path(f).relative_to(cwd)) for f in files]
    run([sys.executable, str(tex_to_ir), *rel_files, "--out", str(out_dir), *extra_args], cwd=cwd)


def build_hugo(ir_to_hugo, ir_dir, out_dir, extra_args=()):
    run([sys.executable, str(ir_to_hugo), str(ir_dir), "--out", str(out_dir), *extra_args])


def sync_stotra_sangrahah(repo_dir, scripts_dir, tmp_dir):
    tex_files = sorted((repo_dir / "stotras").glob("*/*.tex"))
    ir_dir, hugo_dir = tmp_dir / "ir-stotras", tmp_dir / "hugo-stotras"
    build_ir(scripts_dir / "tex_to_ir.py", tex_files, ir_dir, cwd=repo_dir)
    build_hugo(scripts_dir / "ir_to_hugo.py", ir_dir, hugo_dir)
    sync_category_dir(hugo_dir, HUGO_CONTENT / "stotra")


def sync_namavali_manjari(repo_dir, scripts_dir, tmp_dir):
    tex_files = []
    for sub in ("100", "300", "1000", "small"):
        tex_files.extend(sorted((repo_dir / sub).glob("*.tex")))
    ir_dir, hugo_dir = tmp_dir / "ir-namavali", tmp_dir / "hugo-namavali"
    build_ir(scripts_dir / "tex_to_ir.py", tex_files, ir_dir, cwd=repo_dir)
    build_hugo(
        scripts_dir / "ir_to_hugo.py", ir_dir, hugo_dir,
        extra_args=[
            "--pdf-repo", "stotrasamhita/namavali-manjari",
            "--pdf-variants", "A5 / print=namavalis-pdf,Kindle=namavalis-kindle-pdf,Kindle Scribe=namavalis-kindle-scribe-pdf",
            "--strip-prefix", "",
        ],
    )
    sync_category_dir(hugo_dir, HUGO_CONTENT / "namavali")


def sync_puja_vidhanam(repo_dir, scripts_dir, tmp_dir):
    excluded = re.compile(r"^(shivaratri-yama-[1-4]-puja|MahaNyasah)\.tex$")
    tex_files = sorted(f for f in (repo_dir / "pujas").glob("*.tex") if not excluded.match(f.name))
    ir_dir, hugo_dir = tmp_dir / "ir-pujas", tmp_dir / "hugo-pujas"
    build_ir(scripts_dir / "tex_to_ir.py", tex_files, ir_dir, cwd=repo_dir)
    build_hugo(scripts_dir / "ir_to_hugo.py", ir_dir, hugo_dir, extra_args=["--pdf-variants", ""])
    sync_flat_dir(hugo_dir / "pujas", HUGO_CONTENT / "puja-vidhanam")


def sync_gita(repo_dir, scripts_dir, tmp_dir):
    # Unlike every other corpus, gita's 4 files sit at its own repo root
    # (no pujas/-, TeX/-, stotras/<category>/-style subdirectory), so there's
    # no natural subdirectory name for tex_to_ir.py's category = path.parent.name
    # to pick up -- build_ir's usual repo_dir-relative paths would go in as
    # bare "gita.tex" (empty parent, empty category, breaking the existing
    # content/gita/gita/ layout). Passed with cwd one level up instead, and
    # each filename prefixed with the repo's own directory name, they
    # resolve to the same files while keeping "gita" as that parent
    # component -- reproducing the category this corpus has always used
    # (an accident of the original absolute-path invocation, "/tmp/gita/
    # gita.tex", picking up the checkout dir's own name), without back to
    # an absolute, checkout-path-dependent argument.
    tex_files = [repo_dir / n for n in ("gita.tex", "mahatmyam.tex", "mahatmyam-varaha-puranam.tex", "gsa.tex")]
    ir_dir, hugo_dir = tmp_dir / "ir-gita", tmp_dir / "hugo-gita"
    build_ir(scripts_dir / "tex_to_ir.py", tex_files, ir_dir, cwd=repo_dir.parent)
    build_hugo(scripts_dir / "ir_to_hugo.py", ir_dir, hugo_dir, extra_args=["--pdf-variants", "", "--split-chapters"])
    sync_flat_dir(hugo_dir / repo_dir.name, HUGO_CONTENT / "gita")


def sync_adhyatma_ramayanam(repo_dir, scripts_dir, tmp_dir):
    # ir_to_hugo.py's CATEGORY_ORDER_OVERRIDES canonical kanda story-order
    # (mahatmyam, bala-kanda, ayodhya-kanda, ...) is keyed by the literal
    # category string "kandas" -- but these 8 files actually live under
    # this repo's TeX/ directory, and tex_to_ir.py derives category from
    # path.parent.name, so a plain repo-relative "TeX/BalaKanda.tex" would
    # tag them "TeX" and silently lose the override (falling back to
    # alphabetical, not story, order). A "kandas" symlink to TeX/ (name
    # matching the override key) reproduces the actual live category with
    # no risk of typo-ing the string in two unrelated places.
    kandas_link = tmp_dir / "kandas"
    kandas_link.symlink_to(repo_dir / "TeX")
    tex_files = sorted(kandas_link.glob("*.tex"))
    ir_dir, hugo_dir = tmp_dir / "ir-adhyatma", tmp_dir / "hugo-adhyatma"
    build_ir(scripts_dir / "tex_to_ir.py", tex_files, ir_dir, cwd=tmp_dir)
    build_hugo(scripts_dir / "ir_to_hugo.py", ir_dir, hugo_dir, extra_args=["--pdf-variants", "", "--split-chapters"])
    sync_flat_dir(hugo_dir / "kandas", HUGO_CONTENT / "adhyatma-ramayanam")


def sync_mahabharatam(repo_dir, scripts_dir, tmp_dir):
    tex_files = [repo_dir / "parvas" / "04-virāṭaparva.tex"]
    ir_dir, hugo_dir = tmp_dir / "ir-mahabharatam", tmp_dir / "hugo-mahabharatam"
    build_ir(scripts_dir / "tex_to_ir.py", tex_files, ir_dir, cwd=repo_dir)
    build_hugo(scripts_dir / "ir_to_hugo.py", ir_dir, hugo_dir, extra_args=["--pdf-variants", "", "--split-chapters"])
    sync_flat_dir(hugo_dir / "parvas", HUGO_CONTENT / "mahabharatam")


# (state key, repo dir name under --repos-dir, sync function)
CORPORA = [
    ("stotra-sangrahah", "stotra-sangrahah", sync_stotra_sangrahah),
    ("namavali-manjari", "namavali-manjari", sync_namavali_manjari),
    ("puja-vidhanam", "puja-vidhanam", sync_puja_vidhanam),
    ("gita", "gita", sync_gita),
    ("adhyatmaramayanam", "adhyatmaramayanam", sync_adhyatma_ramayanam),
    ("mahabharatam", "mahabharatam", sync_mahabharatam),
]


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--repos-dir", required=True, type=Path,
                     help="directory containing an up-to-date clone of every corpus repo plus stotra-sangrahah")
    ap.add_argument("--force", action="store_true", help="regenerate every corpus regardless of recorded state")
    args = ap.parse_args()

    scripts_dir = args.repos_dir / "stotra-sangrahah" / "scripts"
    tmp_dir = Path("/tmp/sync-content-build")
    if tmp_dir.exists():
        shutil.rmtree(tmp_dir)
    tmp_dir.mkdir(parents=True)

    state = load_state()
    # stotra-sangrahah supplies the scripts every corpus (including itself)
    # is built with, so any corpus using scripts that just changed needs
    # rebuilding too, even if that corpus's own repo didn't move.
    scripts_sha = git_head_sha(args.repos_dir / "stotra-sangrahah")
    scripts_changed = args.force or state.get("stotra-sangrahah") != scripts_sha

    changed_count = 0
    for state_key, repo_name, sync_fn in CORPORA:
        repo_dir = args.repos_dir / repo_name
        sha = git_head_sha(repo_dir)
        if not (args.force or scripts_changed or state.get(state_key) != sha):
            print(f"skip {state_key}: unchanged ({sha[:8]})", file=sys.stderr)
            continue
        print(f"sync {state_key}: {state.get(state_key, '(none)')[:8] if state.get(state_key) else '(none)'} -> {sha[:8]}", file=sys.stderr)
        sync_fn(repo_dir, scripts_dir, tmp_dir)
        state[state_key] = sha
        changed_count += 1

    save_state(state)
    print(f"changed: {changed_count}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
