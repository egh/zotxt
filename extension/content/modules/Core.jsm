/**
 * Parses an easy key. Returns {creator: ..., title: ..., date: ...} or null if it
 * did not parse correctly.
 */
function parseEasyKey(key, zotero) {
    const easyKeyRe = zotero.Utilities.XRegExp('^(\\p{Lu}[\\p{Ll}_-]+)(\\p{Lu}\\p{Ll}+)?([0-9]{4})?');
    const alternateEasyKeyRe = zotero.Utilities.XRegExp('^([\\p{Ll}_-]+):([0-9]{4})?(\\p{Ll}+)?');
    let result = easyKeyRe.exec(key);
    if (result) {
        return {creator: result[1], title: result[2], date: result[3]};
    } else {
        result = alternateEasyKeyRe.exec(key);
        if (result) {
            return {creator: result[1], title: result[3], date: result[2]};
        } else {
            return null;
        }
    }
}

function fixStyleId(styleId) {
    if (!styleId) {
        return  'http://www.zotero.org/styles/chicago-note-bibliography';
    } else if (!styleId.match(/^http:/)) {
        return 'http://www.zotero.org/styles/' + styleId;
    } else {
        return styleId;
    }
}

/**
 * Prepare query values for us.
 */
function cleanQuery(q) {
    let retval = [];
    for (let key in q) {
        retval[key] = q[key].replace('+', ' ');
    }
    return retval;
}

/* Given a iterable of promises that return an item, return a deduped iterable
 * of promises (based on the id). */
function dedupItems(items, zotero) {
    let seenIds = new Set([]); // To uniqify results
    return zotero.Promise.filter(items, (item) => {
        if (seenIds.has(item.id)) {
            return false;
        } else {
            seenIds.add(item.id);
            return true;
        }
    });
};

function item2key(item) {
    return ((item.libraryID || '1') + '_' + item.key);
}

function findByKey(key, zotero) {
    if (key.indexOf('/') !== -1) {
        let lkh = zotero.Items.parseLibraryKey(key);
        return zotero.Items.getByLibraryAndKeyAsync(lkh.libraryID, lkh.key);
    } else {
        return zotero.Items.getByLibraryAndKeyAsync(1, key);
    }
}

function makeCslEngine (styleId, zotero) {
    let style = zotero.Styles.get(fixStyleId(styleId));
    if (!style) {
        return null;
    } else {
        // jshint camelcase: false
        let csl = style.getCiteProc();
        csl.opt.development_extensions.wrap_url_and_doi = true;
        return csl;
    }
}

function getItemOrParent(item, zotero) {
    // not Regular item or standalone note/attachment
    if (!item.isRegularItem() && item.parentKey) {
        return findByKey(item.parentKey, zotero);
    } else {
        return item;
    }
}

/**
 * Returns a promise resolving to an iterable.
 */
function runSearch(s, zotero) {
    return s.search().then((ids) => {
        let items = zotero.Items.getAsync(ids);
        let items2 = zotero.Promise.map(items, (item)=>{
            return getItemOrParent(item, zotero)
        });
        return dedupItems(items2, zotero);
    });
}

function buildRawSearch(s, key) {
    let str = '@' + key;
    s.addCondition('joinMode', 'any');
    s.addCondition('tag', 'is', str);
    s.addCondition('note', 'contains', str);
    return s;
}

/**
 * Find many items by a (possibly incomplete) parsed easy key.
 */
function buildEasyKeySearch(s, parsedKey) {
    /* allow multiple names separated by _ */
    var splitName = parsedKey.creator.split('_');
    for (let name of splitName) {
        s.addCondition('creator', 'contains', name);
    }
    if (parsedKey.title != null) {
        s.addCondition('title', 'contains', parsedKey.title);
    }
    if (parsedKey.date != null) {
        s.addCondition('date', 'is', parsedKey.date);
    }
    return s;
}

function buildSearch(s, query, method) {
    if (!method) { method = 'titleCreatorYear'; }
    s.addCondition('joinMode', 'all');
    for (let word of query.split(/(?:\+|\s+)/)) {
        s.addCondition('quicksearch-' + method, 'contains', word);
    }
    return s;
}

let knownEasyKeys = {};

/**
 * Find a single item by its easy key, caching the result.
 */
function findByEasyKey(key, zotero) {
    if (knownEasyKeys[key]) {
        return Promise.resolve(knownEasyKeys[key]);
    } else {
        let parsedKey = parseEasyKey(key, zotero);
        if (!parsedKey) {
            return makeEasyKeyError('EasyKey must be of the form DoeTitle2000 or doe:2000title');
        } else {
            /* first try raw search */
            let search = buildRawSearch(new zotero.Search(), key);
            return runSearch(search, zotero).then(function(items) {
                if (items.length === 1) {
                    return knownEasyKeys[key] = items[0];
                } else if (items.length > 1) {
                    return makeEasyKeyError('search return multiple items');
                } else {
                    let search = buildEasyKeySearch(new zotero.Search(), parsedKey);
                    return runSearch(search, zotero).then (function (items) {
                        if (items.length === 1) {
                            return knownEasyKeys[key] = items[0];
                        } else if (items.length > 1) {
                            return makeEasyKeyError('search return multiple items');
                        } else {
                            return makeEasyKeyError('search failed to return a single item');
                        }
                    });
                }
            });
        }
    }
}

function jsonStringify(json) {
    return JSON.stringify(json, null, '  ');
}

const toExport = [parseEasyKey, fixStyleId, cleanQuery, dedupItems, item2key, findByKey, makeCslEngine, getItemOrParent, buildRawSearch, buildEasyKeySearch, runSearch, buildSearch, findByEasyKey, jsonStringify];

var EXPORTED_SYMBOLS = toExport.map((f) => { return f.name; } );

if (typeof process !== 'undefined') {
    toExport.forEach((s) => { module.exports[s.name] = s; });
}
