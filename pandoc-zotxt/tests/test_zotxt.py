# -*- coding: utf-8 -*-
from pandoczotxt import extractCites, alterMetadata, clearKnownKeys
from unittest import TestCase
from copy import deepcopy
import json
from pandocfilters import walk
import subprocess


class ZotxtTest(TestCase):
    DOE_DATA = [{u'publisher': u'Cambridge University Press', u'publisher-place': u'Cambridge', u'author': [{u'given': u'John', u'family': u'Doe'}], u'issued': {u'date-parts': [[u'2005']]}, u'title': u'First Book', u'event-place': u'Cambridge', u'type': u'book', u'id': u'doe:2005first', u'note': u'bibtex: Doe2005'}]
    DOE_DATA_BIBTEX = [{u'publisher': u'Cambridge University Press', u'publisher-place': u'Cambridge', u'author': [{u'given': u'John', u'family': u'Doe'}], u'issued': {u'date-parts': [[u'2005']]}, u'title': u'First Book', u'event-place': u'Cambridge', u'type': u'book', u'id': u'Doe2005', u'note': u'bibtex: Doe2005'}]
    ACCENT_DATA = [{u'publisher': u'De Gruyter', u'ISBN': u'978-3-11-028354-9', u'publisher-place': u'Berlin', u'language': u'German', u'title': u'Wortbildung im niederländisch-deutschen Sprachvergleich', u'issued': {u'date-parts': [[u'2012']]}, u'container-title': u'Deutsch im Sprachvergleich. Grammatische Kontraste  und Konvergenzen', u'id': u'hüning:2012foo', u'source': u'Open WorldCat', u'event-place': u'Berlin', u'collection-number': u'Institut für Deutsche Sprache, Jahrbuch 2011', u'author': [{u'literal': u'Matthias Hüning'}], u'type': u'chapter', u'page': u'161-186', u'editor': [{u'given': u'Lutz', u'family': u'Gunkel'}, {u'given': u'Gisela', u'family': u'Zifonun'}]}]
    INPUT_TEMPLATE = [{"unMeta": {}},
                      [{"t": "Para",
                        "c": [{"t": "Cite",
                               "c": [[{"citationSuffix": [],
                                       "citationNoteNum": 0,
                                       "citationMode": {"t": "AuthorInText",
                                                        "c": []},
                                       "citationPrefix": [],
                                       "citationId": "REPLACE_ME",
                                       "citationHash": 0}],
                                     [{"t": "Str",
                                       "c": "@REPLACE_ME"}]]}]}]]

    def checker(self, input_data, bib_data):
        walk(input_data, extractCites, 'json', {})
        alterMetadata(input_data[0]['unMeta'])
        jsonFile = input_data[0]['unMeta']['bibliography']['c'][0]['c']
        with open(jsonFile) as f:
            test_data = json.load(f)
            self.assertEqual(len(bib_data), len(test_data))
            for i in range(len(bib_data)):
                self.assertDictEqual(bib_data[i], test_data[i])

    def check_citekey(self, key, bib_data):
        # simple
        input_data = deepcopy(self.INPUT_TEMPLATE)
        input_data[1][0]["c"][0]["c"][0][0]["citationId"] = key
        input_data[1][0]["c"][0]["c"][1][0]["c"] = "@%s" % (key)
        self.checker(input_data, bib_data)

        # pandoc integration
        cmd = ["pandoc", "-t", "json"]
        p = subprocess.Popen(cmd, stdout=subprocess.PIPE,
                             stdin=subprocess.PIPE,
                             stderr=subprocess.STDOUT)
        input = u"@%s" % (key)
        input_enc = input.encode('utf8')
        data, _ = p.communicate(input=input_enc)
        self.checker(json.loads(data.decode('utf8')), bib_data)

    def test_extract(self):
        clearKnownKeys()
        self.check_citekey("doe:2005first", self.DOE_DATA)

    def test_extract_accent(self):
        clearKnownKeys()
        self.check_citekey(u"hüning:2012foo", self.ACCENT_DATA)

    def test_extract_betterbibtex(self):
        clearKnownKeys()
        self.check_citekey("Doe2005", self.DOE_DATA_BIBTEX)

    def test_bad_citekey(self):
        clearKnownKeys()
        self.check_citekey("foo:2015bar", [])
