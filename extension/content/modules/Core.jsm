function fixStyleId(styleId) {
    if (!styleId) {
        return  'http://www.zotero.org/styles/chicago-note-bibliography';
    } else if (!styleId.match(/^https?:/)) {
        return 'http://www.zotero.org/styles/' + styleId;
    } else {
        return styleId;
    }
}

/**
 * Prepare query values for us.
 */
function cleanQuery(q) {
    let retval = {};
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

function ensureLoaded(items, zotero) {
    return zotero.Promise.map(items, (item)=>{
        return item.loadAllData().then(()=> {
            return item;
        });
    });
}

function item2key(item) {
    return ((item.libraryID || '1') + '_' + item.key);
}

function findByKey(key, zotero) {
    let rejectIfUndefined = (item)=>{
        if (!item) {
            return makeClientError(`${key} not found`);
        } else {
            return item;
        }
    };
    if (key.indexOf('/') !== -1) {
        let lkh = zotero.Items.parseLibraryKey(key);
        return zotero.Items.getByLibraryAndKeyAsync(lkh.libraryID, lkh.key).then(rejectIfUndefined);
    } else if (key.indexOf('_') !== -1) {
        let [libraryId, key2] = key.split('_');
        return zotero.Items.getByLibraryAndKeyAsync(parseInt(libraryId), key2).then(rejectIfUndefined);
    } else {
        return zotero.Items.getByLibraryAndKeyAsync(1, key).then(rejectIfUndefined);
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

function buildSearch(s, query, method) {
    if (!method) { method = 'titleCreatorYear'; }
    s.addCondition('joinMode', 'all');
    for (let word of query.split(/(?:\+|\s+)/)) {
        s.addCondition('quicksearch-' + method, 'contains', word);
    }
    return s;
}


function ClientError(message) {
    this.name = 'ClientError';
    this.message = message;
    this.stack = (new Error()).stack;
}

ClientError.prototype = new Error;

function makeClientError(str) {
    return Promise.reject(new ClientError(str));
}

function findByBBTKey(citekey, zotero) {
    let libraryID = zotero.Libraries.userLibraryID;
    let item = zotero.BetterBibTeX.KeyManager.keys.findOne({ libraryID, citekey });
    if (item === null) {
        return makeClientError(`${citekey} had no results`);
    }
    let itemId = item.itemID;
    return zotero.Items.getAsync(itemId);
}

function completeBBTKey(citekey, zotero) {
    let libraryID = zotero.Libraries.userLibraryID;
    return zotero.BetterBibTeX.KeyManager.keys.find(
        { 'libraryID': libraryID, 'citekey': { '$contains' : citekey } }
    ).map((item) => {
        return item.citekey;
    });
}

function jsonStringify(json) {
    return JSON.stringify(json, null, '  ');
}

function extractCiteKey(q) {
    return q.citekey || q.betterbibtexkey || q.easykey;
}

const toExport = [fixStyleId, cleanQuery, dedupItems, item2key, findByKey, makeCslEngine, getItemOrParent, buildRawSearch, runSearch, buildSearch, findByBBTKey, jsonStringify, makeClientError, ClientError, ensureLoaded, completeBBTKey, extractCiteKey];

var EXPORTED_SYMBOLS = toExport.map((f) => { return f.name; } );

if (typeof process !== 'undefined') {
    toExport.forEach((s) => { module.exports[s.name] = s; });
}

