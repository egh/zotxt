.PHONY: clean

zotxt.xpi: install.rdf bootstrap.js resource/translators/EasyKeyExporter.js
	cd extension && zip ../zotxt.xpi $?

install.rdf bootstrap.js resource/translators/EasyKeyExporter.js:

clean:
	rm -f zotxt.xpi