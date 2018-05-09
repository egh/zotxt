================
pandoc-zotxt.lua
================

``pandoc-zotxt.lua`` looks up sources of citations in Zotero and adds
their bibliographic data to the metadata of the document, where it
can be read by ``pandoc-citeproc``.

You need the zotxt_ plugin for Zotero. Citations should be inserted
as so-called easy citekeys. See the documentation of *zotxt* for details.

See the `manual page <man/pandoc-zotxt.lua.rst>`_ for more details.


Installing ``pandoc-zotxt.lua``
===============================

You use ``pandoc-zotxt.lua`` **at your own risk**. You have been warned.

You need Pandoc_ 2.0 or later. If you are using an older version of Pandoc,
try `pandoc-zotxt <https://github.com/egh/zotxt>`_,
which works with Pandoc 1.12 or later (but also requires Python_ 2.7).

1. Download the `current release
   <https://codeload.github.com/odkr/pandoc-zotxt/tar.gz/v0.1.1>`_.
2. Unpack it.
3. Copy the whole directory to the ``filters``
   subdirectory of your Pandoc data directory.

Where your Pandoc data directory is located depends on your operating system.
``pandoc --version`` will tell you. Consult the Pandoc manual for details.

You may also want to copy the manual page to wherever your system stores manual
pages; typically, this is ``/usr/local/share/man/``.

If you are using a Unix-ish operating system, you can do all of the above by::

    PANDOC_DATA_DIR=$(pandoc --version |
        sed -n 's/^Default user data directory: //p')
    mkdir -p "${PANDOC_DATA_DIR:?}/filters"
    cd "${PANDOC_DATA_DIR:?}/filters"
    curl https://codeload.github.com/odkr/pandoc-zotxt.lua/tar.gz/v0.1.1 |
        tar -xz
    sudo cp pandoc-zotxt.lua-0.1.1/man/pandoc-zotxt.lua.1 \
        /usr/local/share/man/man1


``pandoc-zotxt.lua`` vs ``pandoc-zotxt``
========================================

I started to write ``pandoc-zotxt.lua`` because I had hoped that I could write
a faster replacement for ``pandoc-zotxt``. Unfortunately, Pandoc_ does *not*
support LuaSocket_ (a library for retrieving data via a network) and only 
provides a blocking method to fetch data from a network itself. So, there is
no way to retrieve data for multiple citation items concurrently. 
As a consequence, ``pandoc-zotxt.lua`` is about as fast as ``pandoc-zotxt``.

+------------------------------------+---------------------------------------+
| ``pandoc-zotxt.lua``               | ``pandoc-zotxt``                      |
+====================================+=======================================+
| Requires only Pandoc_ 2.0          | Requires Pandoc_ 1.12 and Python_ 2.7 |
+------------------------------------+---------------------------------------+
| Apparently, a tiny bit faster      | Apparently, a tiny bit faster         |
| for long and/or complex documents. | for short and/or simple documents.    |
| (But you won't notice.)            | (But you won't notice.)               |
+------------------------------------+---------------------------------------+
| Doesn't use temporary files.       | Does use a temporary file.            |
+------------------------------------+---------------------------------------+


Test suite
==========

For the test suite to work, you need Zotero_ and the sources that are cited
in the test documents. You can import those sources from the file ``items.rdf``
in the directory ``test``. To run the test suite, just say::

    make test


Documentation
=============

See the `manual page <man/pandoc-zotxt.lua.rst>`_
and the source for details.


Contact
=======

If there's something wrong with ``pandoc-zotxt.lua``, `open an issue
<https://github.com/odkr/pandoc-zotxt.lua/issues>`_.


License
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


Further Information
===================

GitHub:
<https://github.com/odkr/pandoc-zotxt.lua>


See also
========
<https://github.com/egh/zotxt>


.. _zotxt: https://github.com/egh/zotxt
.. _Zotero: https://www.zotero.org/
.. _Pandoc: https://www.pandoc.org/
.. _Python: https://www.python.org/
.. _LuaSocket: https://github.com/diegonehab/luasocket
