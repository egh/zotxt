.PHONY: clean

zotxt.xpi: extension/install.rdf extension/bootstrap.js extension/resource/translators/EasyKeyExporter.js
	zip zotxt.xpi $?

clean:
	rm -f zotxt.xpi