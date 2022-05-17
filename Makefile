.PHONY: clean test unittest dist

VERSION=$(shell grep em:version extension/install.rdf | grep -o "[0-9\\.]*")

dist: test zotxt-$(VERSION).xpi ;

notest: zotxt-$(VERSION).xpi ;

zotxt-$(VERSION).xpi: extension/install.rdf extension/bootstrap.js extension/resource/translators/EasyKeyExporter.js
	cd extension && zip -r ../zotxt-$(VERSION).xpi *

clean:
	rm -f zotxt-*.xpi

unittest:
	npm test

test: unittest
	cd test && ruby test.rb
