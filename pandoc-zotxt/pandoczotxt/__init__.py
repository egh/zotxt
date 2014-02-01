#!/usr/bin/env python

from pandocfilters import walk, Header, Str, elt
import codecs
import json
import sys
import tempfile
import urllib, urllib2

MetaInlines = elt('MetaInlines',1)

def toJSONFilter(filters=[], metafilters=[]):
  doc = json.loads(sys.stdin.read())
  if len(sys.argv) > 1:
    format = sys.argv[1]
  else:
    format = ""
  altered = doc
  for action in filters:
    altered = walk(altered, action, format, doc[0]['unMeta'])
  for action in metafilters:
    action(altered[0]['unMeta'])
  json.dump(altered, sys.stdout)

known_keys = set([])

def extractCites(key, value, format, meta):
  global known_keys
  if key == "Cite":
    known_keys.add(value[0][0]['citationId'])

def alterMetadata(meta):
  global known_keys
  cites = []
  for citekey in known_keys:
    try:
      q = {'easykey' : citekey.encode('utf8')}
      encq = urllib.urlencode(q)
      cite = json.load(urllib2.urlopen("http://localhost:23119/zotxt/items?" + encq))[0]
      cite["id"] = citekey
      cites.append(cite)
    except urllib2.HTTPError, e:
      sys.stderr.write("error with %s : %s \n"%(citekey.encode('utf8'), e.read()))
  tmpfile = tempfile.NamedTemporaryFile(suffix='.json', delete=False)
  json.dump(cites, tmpfile, indent=2)
  tmpfile.close()
  meta['bibliography'] = MetaInlines([Str(tmpfile.name)])

def run():
    toJSONFilter(filters=[extractCites], metafilters=[alterMetadata])