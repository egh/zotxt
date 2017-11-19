.PHONY: clean

VERSION=$(shell grep em:version extension/install.rdf | grep -o "[0-9\\.]*")

zotxt-$(VERSION).xpi: extension/install.rdf extension/bootstrap.js extension/resource/translators/EasyKeyExporter.js test
	cd extension && zip ../zotxt-$(VERSION).xpi install.rdf bootstrap.js resource/translators/EasyKeyExporter.js

clean:
	rm -f zotxt-*.xpi

test:
	cd tests && ruby test.rb
	cd pandoc-zotxt && ./venv/bin/nosetests

pypi: test
	cd pandoc-zotxt && python setup.py sdist upload
