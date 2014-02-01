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
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with Foobar.  If not, see <http://www.gnu.org/licenses/>.

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
    except urllib2.HTTPError, e:
        sys.stderr.write("error with %s : %s \n"%(key, e.read()))
print json.dumps(cites, indent=2)