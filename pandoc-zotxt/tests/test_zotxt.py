# -*- coding: utf-8 -*-
from pandoczotxt import extractCites, alterMetadata, clearKnownKeys
from unittest import TestCase
import json
from nose.plugins.attrib import attr
from pandocfilters import walk


class ZotxtTest(TestCase):
    def test_extract(self):
        clearKnownKeys()
        data = [{"unMeta": {}}, [{"t": "Para", "c": [{"t": "Cite", "c": [[{"citationSuffix": [], "citationNoteNum": 0, "citationMode": {"t": "AuthorInText", "c": []}, "citationPrefix": [], "citationId": "doe:2005first", "citationHash": 0}], [{"t": "Str", "c": "@doe:2005first"}]]}]}]]
        walk(data, extractCites, 'json', {})
        alterMetadata(data[0]['unMeta'])
        jsonFile = data[0]['unMeta']['bibliography']['c'][0]['c']
        with open(jsonFile) as f:
            self.assertEqual( [{u'publisher': u'Cambridge University Press', u'publisher-place': u'Cambridge', u'author': [{u'given': u'John', u'family': u'Doe'}], u'issued': {u'date-parts': [[u'2005']]}, u'title': u'First Book', u'event-place': u'Cambridge', u'type': u'book', u'id': u'doe:2005first', u'note': u'bibtex: Doe2005'}], json.load(f))

    def test_extract_accent(self):
        clearKnownKeys()
        data = [{"unMeta": {}}, [{"t": "Para", "c": [{"t": "Cite", "c": [[{"citationSuffix": [], "citationNoteNum": 0, "citationMode": {"t": "AuthorInText", "c": []}, "citationPrefix": [], "citationId": "hüning:2012foo", "citationHash": 0}], [{"t": "Str", "c": "@hüning:2012foo"}]]}]}]]
        walk(data, extractCites, 'json', {})
        alterMetadata(data[0]['unMeta'])
        jsonFile = data[0]['unMeta']['bibliography']['c'][0]['c']
        with open(jsonFile) as f:
            data = [{u'publisher': u'De Gruyter', u'ISBN': u'9783110283549', u'publisher-place': u'Berlin', u'language': u'German', u'title': u'Wortbildung im niederländisch-deutschen Sprachvergleich', u'issued': {u'date-parts': [[u'2012']]}, u'container-title': u'Deutsch im Sprachvergleich. Grammatische Kontraste  und Konvergenzen', u'id': u'hüning:2012foo', u'source': u'Open WorldCat', u'event-place': u'Berlin', u'collection-number': u'Institut für Deutsche Sprache, Jahrbuch 2011', u'author': [{u'literal': u'Matthias Hüning'}], u'type': u'chapter', u'page': u'161-186', u'editor': [{u'given': u'Lutz', u'family': u'Gunkel'}, {u'given': u'Gisela', u'family': u'Zifonun'}]}]
            self.assertEqual(data, json.load(f))

    def test_extract_betterbibtex(self):
        clearKnownKeys()
        data = [{"unMeta": {}}, [{"t": "Para", "c": [{"t": "Cite", "c": [[{"citationSuffix": [], "citationNoteNum": 0, "citationMode": {"t": "AuthorInText", "c": []}, "citationPrefix": [], "citationId": "Doe2005", "citationHash": 0}], [{"t": "Str", "c": "Doe2005"}]]}]}]]
        walk(data, extractCites, 'json', {})
        alterMetadata(data[0]['unMeta'])
        jsonFile = data[0]['unMeta']['bibliography']['c'][0]['c']
        with open(jsonFile) as f:
            self.assertEqual( [{u'publisher': u'Cambridge University Press', u'publisher-place': u'Cambridge', u'author': [{u'given': u'John', u'family': u'Doe'}], u'issued': {u'date-parts': [[u'2005']]}, u'title': u'First Book', u'event-place': u'Cambridge', u'type': u'book', u'id': u'Doe2005', u'note': u'bibtex: Doe2005'}], json.load(f))
