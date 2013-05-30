#!/usr/bin/env python
import json
import re
import sys
import urllib2

f = open(sys.argv[1], 'r')
cite_re = re.compile(r'(?:@)[\w:\.#$%&_+?<>~/-]+')
known_keys = set([])
for line in f:
    citekeys = re.findall(cite_re, line)
    for citekey in citekeys:
        if citekey not in known_keys:
            known_keys.add(citekey[1:])

cites = []
for key in known_keys:
    cite = json.load(urllib2.urlopen("http://localhost:23119/zotxt/item?easykey=%s"%key))
    cite["id"] = key
    cites.append(cite)
print json.dumps(cites, indent=2)