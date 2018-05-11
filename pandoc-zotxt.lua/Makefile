test: test-doc test-call-citeproc test-dont-call-citeproc

test-doc:
	rm -f test/doc-is.html
	pandoc --lua-filter ./pandoc-zotxt.lua -F pandoc-citeproc \
		-o test/doc-is.html test/doc.md
	cmp test/doc-is.html test/doc-should.html


test-bbt:
	rm -f test/bbt-is.html
	pandoc --lua-filter ./pandoc-zotxt.lua -F pandoc-citeproc \
		-o test/bbt-is.html test/bbt.md
	cmp test/bbt-is.html test/bbt-should.html

test-call-citeproc:
	rm -f test/call-citeproc-is.html
	pandoc --lua-filter ./pandoc-zotxt.lua \
		-o test/call-citeproc-is.html test/call-citeproc.md
	cmp test/call-citeproc-is.html test/call-citeproc-should.html

test-dont-call-citeproc:
	rm -f test/dont-call-citeproc-is.html
	pandoc --lua-filter ./pandoc-zotxt.lua \
		-o test/dont-call-citeproc-is.html test/dont-call-citeproc.md
	cmp test/dont-call-citeproc-is.html test/dont-call-citeproc-should.html

performance-comparison:
	time pandoc -F pandoc-zotxt -o /dev/null test/long.md
	time pandoc --lua-filter ./pandoc-zotxt.lua -o /dev/null test/long.md

.PHONY: test test-doc test-bbt test-call-citeproc test-dont-call-citeproc \
	performance-comparison 
