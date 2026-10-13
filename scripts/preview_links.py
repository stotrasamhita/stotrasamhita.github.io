#!/usr/bin/env python3
"""Rebases a Hugo build of the redesign branch to serve under /preview/.

The redesign templates link to root paths (/stotra/, /namavali/, ...). This
prefixes those with /preview/ in every HTML file, except the pages Jekyll
still serves at the root (About, Major Books, PDFs, favicon), and marks every
page noindex so the preview never competes with the live site in search.
Temporary: goes away when the redesign is merged into master.
"""
import pathlib
import re
import sys

PREFIX = '/preview'
ROOT_ONLY = ('/about/', '/major-books/', '/individual-pdfs/', '/panchangam/',
             '/posts/', '/assets/', '/favicon.png')
LINK = re.compile(r'((?:href|src|action)=["\']?)(/(?!/)[^"\'\s>]*)')


def fix(m):
    url = m.group(2)
    if url == PREFIX or url.startswith(PREFIX + '/') or url.startswith(ROOT_ONLY):
        return m.group(0)
    return m.group(1) + PREFIX + url


for f in pathlib.Path(sys.argv[1]).rglob('*.html'):
    text = f.read_text(encoding='utf-8')
    new = LINK.sub(fix, text).replace('<head>', '<head><meta name="robots" content="noindex">', 1)
    if new != text:
        f.write_text(new, encoding='utf-8')
