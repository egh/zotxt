================
pandoc-zotxt.lua
================

--------------------------
Looks up sources in Zotero
--------------------------

:Author: Odin Kroeger
:Date: May 9, 2018
:Version: 0.1.1
:Manual section: 1


SYNOPSIS
========

pandoc [...] --lua-filter pandoc-zotxt.lua-0.1.1/pandoc-zotxt.lua [...]


DESCRIPTION
===========

``pandoc-zotxt.lua`` looks up sources of citations in Zotero and adds
their bibliographic data to the metadata of the document, where it
can be read by ``pandoc-citeproc``.

You need the ``zotxt`` plugin for Zotero. Citations should be inserted
as so-called easy citekeys. See the documentation of ``zotxt`` for details.

If you want ``pandoc-zotxt.lua`` to call ``pandoc-citeproc`` automatically,
set the metadata field ``call-citeproc`` to ``true`` (or another truey value).
This is useful if you are using ``panzer``, which insists on calling
Lua filters after 'ordinary' ones.


LICENSE
=======

Copyright 2018 Odin Kroeger

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


FURTHER INFORMATION
===================

* <https://github.com/odkr/pandoc-zotxt.lua>
* <https://github.com/egh/zotxt>
* <https://github.com/msprev/panzer>


SEE ALSO
========

pandoc(1), pandoc-citeproc(1)
