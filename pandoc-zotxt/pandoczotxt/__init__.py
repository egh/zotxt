#!/usr/bin/env python

# This file is part of zotxt.
#
# zotxt is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# Foobar is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.    See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with Foobar.    If not, see <http://www.gnu.org/licenses/>.

from pandocfilters import walk, Str, elt
import codecs
import json
import sys
import tempfile
import urllib
import urllib2

MetaInlines = elt('MetaInlines', 1)


def toJSONFilter(filters=[], metafilters=[]):
    reader = codecs.getreader('utf8')
    doc = json.loads(reader(sys.stdin).read())
    if len(sys.argv) > 1:
        format = sys.argv[1]
    else:
        format = ""
    altered = doc
    for action in filters:
        altered = walk(altered, action, format, doc['meta'])
    for action in metafilters:
        action(altered['meta'])
        json.dump(altered, sys.stdout)

known_keys = set([])


def clearKnownKeys():
    global known_keys
    known_keys = set([])


def extractCites(key, value, format, meta):
    global known_keys
    if key == "Cite":
        for cite in value[0]:
            known_keys.add(cite['citationId'])


def fetchItem(keytype, key):
    keyenc = key.encode('utf8')
    url = "http://localhost:23119/zotxt/items?%s=%s" % (keytype, urllib.quote_plus(keyenc))
    try:
        data = json.load(urllib2.urlopen(url))
        if len(data) == 0:
            return None
        else:
            cite = data[0]
            cite["id"] = key
            return cite
    except (urllib2.HTTPError, IndexError), e:
        return None

def alterMetadata(meta):
    global known_keys
    cites = []
    for citekey in known_keys:
        cite = fetchItem('easykey', citekey)
        if cite:
            cites.append(cite)
        else:
            cite = fetchItem('betterbibtexkey', citekey)
            if cite:
                cites.append(cite)
    tmpfile = tempfile.NamedTemporaryFile(suffix='.json', delete=False)
    json.dump(cites, tmpfile, indent=2)
    tmpfile.close()
    meta['bibliography'] = MetaInlines([Str(tmpfile.name)])


def run():
        toJSONFilter(filters=[extractCites], metafilters=[alterMetadata])
