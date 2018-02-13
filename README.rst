====================================
 zotxt: a Zotero extension for text
====================================

zotxt is a Zotero extension for supporting utilities that deal with
plain text files (e.g., markdown, reStructuredText, latex, etc.)

zotxt is compatible with Zotero 5. Older versions were compatible with Zotero 4,
but these are no longer supported.

Installation
------------

1. Visit https://github.com/egh/zotxt/releases
2. Download the latest ``.xpi`` file.
3. Start Zotero standalone.
4. In Zotero, select Tools -> Add-ons -> Gear (upper right) -> Install Add-On
   from file, and install the downloaded xpi file.

It is recommended that you also install `Better BibTeX for Zotero
<https://github.com/retorquere/zotero-better-bibtex/wiki/Installation>`_, which
provides excellent citation key management.

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

You will need to install the ``pandoc-zotxt`` script. This can be done
with pip::

  sudo pip install pandoc-zotxt

or you can install from source using the ``setup.py`` file.

Pandoc can now be invoked using its filter feature::

  pandoc -F pandoc-zotxt -F pandoc-citeproc document.md

This will generate a JSON file in temporary storage and load your
citations into it. The citations will be passed on to pandoc.

Custom keys
-----------

Sometimes you may wish to set a custom key for an item; for instance,
in the case where two items would have the same key otherwise. This
can be done by adding a tag of the form: ``@doe:2014title`` to an item
in Zotero, or by adding a note with the same content. Zotxt will first
look for keys in a note or tag before resolving the item otherwise.

Zotxt API
---------

The Zotxt API is exposed via ``http://127.0.0.1:23119/zotxt/``. To
retrieve an item, use the ``items`` endpoint with different
parameters. you can query using the params ``easykey``, ``key``,
``selected=t``, ``all=t``, or ``collection``. For example:

  http://127.0.0.1:23119/zotxt/items?easykey=roe-doe:2015hyphens

For ``collection`` or ``key``, provide the Zotero key (e.g.
``0_VWYXZ1A1``)

You can return the data in different formats by using the ``format`` parameter,
including ``easykey`` (an array of easykeys), ``betterbibtexkey`` (an array of
better bibtex keys), ``key`` (an array of Zotero keys), ``bibtex``,
``bibliography`` (see also the ``style`` parameter), or ``json`` (which output
CSL-JSON format, using Zotero BetterBibTeX’s export if available). For example:

  http://127.0.0.1:23119/zotxt/items?easykey=roe-doe:2015hyphens&format=easykey

To search, use the ``search`` endpoint with the ``q`` parameter. This
uses the title/creator/year quick search. You can use the ``format``
param as in the ``items`` endpoint. For example:

  http://127.0.0.1:23119/zotxt/search?q=doe&format=easykey

You can supply an argument to the ``method`` parameter to change the
quicksearch version, either ``titleCreatorYear`` (the default),
``everything`` or ``fields``. By default, search is done only in the
private library, but the parameter ``library`` allows you to provide a
specific libraryID to use, or the string ``all`` for searching in all
libraries.

