.PHONY: clean test unittest

VERSION=$(shell grep em:version extension/install.rdf | grep -o "[0-9\\.]*")

zotxt-$(VERSION).xpi: extension/install.rdf extension/bootstrap.js unittest
	cd extension && zip -r ../zotxt-$(VERSION).xpi *

clean:
	rm -f zotxt-*.xpi

unittest:
	npm test

test: unittest
	cd test && ruby test.rb
