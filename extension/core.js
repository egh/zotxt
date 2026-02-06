function fixStyleId(styleId) {
    if (!styleId) {
        return "http://www.zotero.org/styles/chicago-notes-bibliography";
    } else if (!styleId.match(/^https?:/)) {
        return "http://www.zotero.org/styles/" + styleId;
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
        retval[key] = q[key].replace("+", " ");
    }
    return retval;
}

/* Given a iterable of promises that return an item, return a deduped iterable
 * of promises (based on the id). */
async function dedupItems(items, zotero) {
    let seenIds = new Set([]); // To uniqify results
    let resolvedItems = await Promise.all(items);
    let dedupedItems = [];
    for (let i = 0; i < resolvedItems.length; i++) {
        let item = resolvedItems[i];
        if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            dedupedItems.push(item);
        }
    }
    return dedupedItems;
}

function ensureLoaded(items, zotero) {
    return Promise.all(
        items.map(async (item) => {
            await item.loadAllData();
            return item;
        }),
    );
}

function item2key(item) {
    return (item.libraryID || "1") + "_" + item.key;
}

async function findByKey(key, zotero) {
    let item;
    if (key.indexOf("/") !== -1) {
        let lkh = zotero.Items.parseLibraryKey(key);
        item = await zotero.Items.getByLibraryAndKeyAsync(
            lkh.libraryID,
            lkh.key,
        );
    } else if (key.indexOf("_") !== -1) {
        let [libraryId, key2] = key.split("_");
        item = await zotero.Items.getByLibraryAndKeyAsync(
            parseInt(libraryId),
            key2,
        );
    } else {
        item = await zotero.Items.getByLibraryAndKeyAsync(1, key);
    }
    if (!item) {
        throw new ClientError(`${key} not found`);
    } else {
        return item;
    }
}

function checkStyleId(styleId, zotero) {
    const styleIds = Object.keys(zotero.Styles.getAll());
    if (styleIds.indexOf(styleId) === -1) {
        throw new ClientError(`Style ${styleId} is not installed.`);
    }
    return styleId;
}

function makeCslEngine(styleIdRaw, locale, zotero, format) {
    const styleId = fixStyleId(styleIdRaw);
    checkStyleId(styleId, zotero);
    let style = zotero.Styles.get(styleId);
    if (!style) {
        return null;
    } else {
        // jshint camelcase: false
        let csl = style.getCiteProc(locale, format);
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

async function runSearch(s, zotero) {
    let results = await s.search();
    let items = await zotero.Items.getAsync(results);
    let items2 = await Promise.all(
        items.map((item) => {
            return getItemOrParent(item, zotero);
        }),
    );
    return dedupItems(items2, zotero);
}

function buildSearch(s, query, method) {
    if (!method) {
        method = "titleCreatorYear";
    }
    s.addCondition("joinMode", "all");
    for (let word of query.split(/(?:\+|\s+)/)) {
        s.addCondition("quicksearch-" + method, "contains", word);
    }
    return s;
}

class ClientError extends Error {
    constructor(message) {
        super(message);
        this.name = "ClientError";
    }
}

async function findByCitationKey(citekey, zotero) {
    const search = new zotero.Search();
    search.addCondition("libraryID", "is", zotero.Libraries.userLibraryID);
    search.addCondition("citationKey", "is", citekey);
    const itemID = await search.search();
    return itemID.length ? await zotero.Items.getAsync(itemID[0]) : undefined;
}

async function searchByCitationKeyPrefix(prefix, zotero) {
    checkBBT();
    const search = new zotero.Search();
    search.addCondition("libraryID", "is", zotero.Libraries.userLibraryID);
    search.addCondition("citationKey", "contains", prefix);
    const itemIDs = await search.search();
    const items = await zotero.Items.getAsync(itemIDs);

    return items.filter((item) => {
        const key = item.getField("citationKey");
        return key && key.startsWith(prefix);
    });
}

function jsonStringify(json) {
    return JSON.stringify(json, null, "  ");
}

function checkBBT() {
    if (!Zotero.BetterBibTeX) {
        throw new ClientError("BetterBibTeX not installed.");
    }
}

/* Exported for tests in nodejs */
if (typeof module !== "undefined") {
    module.exports = {
        buildSearch,
        checkBBT,
        checkStyleId,
        cleanQuery,
        dedupItems,
        findByCitationKey,
        findByKey,
        fixStyleId,
        getItemOrParent,
        item2key,
        jsonStringify,
        makeCslEngine,
        searchByCitationKeyPrefix,
        ClientError,
    };
}
