====================================
 zotxt: a Zotero extension for text
====================================

zotxt is a Zotero extension for supporting utilities that deal with
plain text files (e.g., markdown, reStructuredText, latex, etc.)

You can build yourself using ``make``, or you can download from the
Mozilla addons site:

  https://addons.mozilla.org/en-US/firefox/addon/zotxt/

Writing with pandoc
-------------------

If you use pandoc, zotxt can help you deal with citations stored in
Zotero. After installing the extension, modify your Zotero preferences
to make the “Easy Citekey” exporter your default for “Quick Copy”.

Now, when editing a markdown document in your text editor, use either
the drag and drop or quick copy shortcut key (Ctrl-Alt-C) to copy a
pandoc-compatible “Easy Citekey” citation into your document. You can
also generate your own citekey using the author’s last name, a word
from the title, and the date, e.g., ``@doe:2000title``

When you are finished writing, you can use the python script
``extractcites.py``, located in the ``scripts`` directory, to retrieve
a citeproc-json version of your citations. This script should run
under any python. It is invoked as follows::

  python extractcites.py document.md > document.json

This will generate the ``document.json`` file. pandoc may then be used
as usual::

  pandoc document.md --bibliography=document.json
