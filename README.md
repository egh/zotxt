# zotxt: a Zotero extension for text

zotxt is a Zotero extension for supporting utilities that deal with
plain text files (e.g., markdown, reStructuredText, latex, etc.)

## Installation

1. Visit <https://github.com/egh/zotxt/releases>
2. Download the latest `.xpi` file. If you are using Firefox, you will need to right-click and "Save as"
3. Start Zotero standalone.
4. In Zotero, select Tools -\> Add-ons -\> Gear (upper right) -\> Install Add-On from file, and install the downloaded xpi file.

## pandoc integration

Please install the [pandoc-zotxt.lua](https://github.com/odkr/pandoc-zotxt.lua) extension to pandoc as well as [Better BibTeX](https://github.com/retorquere/zotero-better-bibtex/wiki/Installation),
which provides excellent citation key management.

Using the [citation keys](https://retorque.re/zotero-better-bibtex/citing/) provided by Better BibTeX in pandoc citation format, you can automatically connect pandoc to a running Zotero instance to generate citations. (An example of a pandoc citation is `[@Doe2006]` where `Doe2006` is the citation key set by Better BibTex.)

For example:

    pandoc -L pandoc-zotxt.lua -C file.md -t pdf -o file.pdf

## emacs integration

See [zotxt-emacs](https://github.com/egh/zotxt-emacs)

## Zotxt API

The Zotxt API is exposed via `http://127.0.0.1:23119/zotxt/`. To get an idea of what is possible, your best bet is probably to have a look at the `test/test.rb` file.
