.PHONY: clean test unittest dist

VERSION=$(shell jq .version extension/manifest.json -r)

dist: test zotxt-$(VERSION).xpi ;

notest: zotxt-$(VERSION).xpi ;

zotxt-$(VERSION).xpi: extension/*.js extension/resource/translators/EasyKeyExporter.js 
	cd extension && zip -r ../zotxt-$(VERSION).xpi *

clean:
	rm -f zotxt-*.xpi

unittest:
	npm test

test: unittest
	cd test && ruby test.rb
