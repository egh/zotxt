.PHONY: clean

zotxt.xpi: extension/install.rdf extension/bootstrap.js extension/resource/translators/EasyKeyExporter.js test
	cd extension && zip ../zotxt.xpi install.rdf bootstrap.js resource/translators/EasyKeyExporter.js

clean:
	rm -f zotxt.xpi

test:
	cd tests && ruby test.rb
	cd pandoc-zotxt && ./venv/bin/nosetests
