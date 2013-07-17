#!/usr/bin/env python
import codecs
import json
import re
import sys
import urllib, urllib2

f = codecs.open(sys.argv[1], 'r', encoding='utf-8')
cite_re = re.compile(r'(?:@)[\w:\.#$%&_+?<>~/-]+', re.U)
known_keys = set([])
for line in f:
    citekeys = re.findall(cite_re, line)
    for citekey in citekeys:
        if citekey not in known_keys:
            known_keys.add(citekey[1:])

cites = []
for key in known_keys:
    try:
        q = {'easykey' : key.encode('utf8')}
        encq = urllib.urlencode(q)
        cite = json.load(urllib2.urlopen("http://localhost:23119/zotxt/items?" + encq))[0]
        cite["id"] = key
        cites.append(cite)
    except urllib2.HTTPError:
        sys.stderr.write("%s not found!\n"%(key))
print json.dumps(cites, indent=2)