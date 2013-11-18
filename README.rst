====================================
 zotxt: a Zotero extension for text
====================================

zotxt is a Zotero extension for supporting utilities that deal with
plain text files (e.g., markdown, reStructuredText, latex, etc.)

You can build yourself using ``make``, or you can download from the
Mozilla addons site:

  https://addons.mozilla.org/en-US/firefox/addon/zotxt/

Writing with pandoc (1.12 or later)
-----------------------------------

If you use pandoc, zotxt can help you deal with citations stored in
Zotero. After installing the extension, modify your Zotero preferences
to make the “Easy Citekey” exporter your default for “Quick Copy”.

Now, when editing a markdown document in your text editor, use either
the drag and drop or quick copy shortcut key (Ctrl-Alt-C) to copy a
pandoc-compatible “Easy Citekey” citation into your document. You can
also generate your own citekey using the author’s last name, a word
from the title, and the date, e.g., ``@doe:2000title``

You will need to copy or symlink the ``pandoc-zotxt`` script to
somewhere in your ``$PATH``.

Pandoc can now be invoked using its filter feature:

  pandoc -F pandoc-zotxt -F pandoc-citeproc document.md

This will generate a JSON file in temporary storage and load your
citations into it. The citations will be passed on to pandoc.
