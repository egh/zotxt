// This file is part of zotxt.

// zotxt is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Foobar is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Foobar.  If not, see <http://www.gnu.org/licenses/>.

Components.utils.import("resource://gre/modules/Services.jsm");
var z;
var console = Services.console;
var easyKeyRe;
var alternateEasyKeyRe;

let easyKeyExporterMetadata = {
    "translatorID":"9d774afe-a51d-4055-a6c7-23bc96d19fe7",
    "label": "Easy Citekey",
    "creator": "Erik Hetzner",
    "target": "txt",
    "minVersion": "2.1.9",
    "maxVersion": "",
    "priority": 200,
    "inRepository": false,
    "translatorType": 2,
    "browserSupport": "gcs",
    "displayOptions": {
        "Alternate (@DoeTitle2000)": false
    },
    "lastUpdated":"2013-07-15 07:03:17"
};

function loadZotero () {
    if (!z) {
        z = Components.classes["@zotero.org/Zotero;1"].
            getService(Components.interfaces.nsISupports).wrappedJSObject;

        /* these must be initialized AFTER zotero is loaded */
        easyKeyRe = z.Utilities.XRegExp("^(\\p{Lu}\\p{Ll}+)(\\p{Lu}\\p{Ll}+)?([0-9]{4})?");
        alternateEasyKeyRe = z.Utilities.XRegExp("^(\\p{Ll}+)(:[0-9]{4})?(\\p{Ll}+)?");
    }
}

/**
 * Proxy sys item for passing in to citeproc. Wraps the
 * zotero.Cite.System object, but allows for locally registered items.
 */
let mySys = {
    retrieveLocale : function (lang) {
        return z.Cite.System.retrieveLocale(lang);
    },
    retrieveItem : function(id) { 
        if (z.localItems[id] != undefined) {
            return z.localItems[id];
        } else { 
            return z.Cite.System.retrieveItem(id);
        }
    }
};

function makeCslEngine (styleId) {
    if (!styleId.match(/^http:/)) {
        styleId = 'http://www.zotero.org/styles/' + styleId;
    }
    let style = z.Styles.get(styleId);
    if (!style) {
        return null;
    } else {
        return style.getCiteProc(true);
    }
}

let knownEasyKeys = {};

/**
 * Parses an easy key. Returns {creator: ..., title: ..., date: ...} or null if it
 * did not parse correctly.
 */
function parseEasyKey(key) {
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

function runSearch(s) {
    let i = s.search();
    if (!i) {
        return [];
    } else if (i.length == 0) {
        return [];
    } else {
        return i.map(function(id) { return z.Items.get(id); });
    }
}

function rawSearch(key) {
    let s = new z.Search();
    s.addCondition("tag", "is", "@" + key);
    return runSearch(s);
}

/**
 * Prepare query values for us.
 */
function cleanQuery(q) {
    let retval = [];
    for (let key in q) {
        retval[key] = q[key].replace("+", " ");
    }
    return retval;
}

function getCollection(name, collections) {
    if (!collections) {
        return getCollection(name, z.getCollections(null));
    } else {
        for (let c in collections) {
            if (collections[c].name === name) {
                return collections[c];
            } else {
                if (collections[c].hasChildCollections) {
                    let retval = getCollection(name, z.getCollections(collections[c].id));
                    if (retval) return retval;
                }
            }
        }
        return null;
    }
}

function collectionSearch(name) {
    let collection = getCollection(name);
    if (!collection) { 
        return [];
    } else {
        return collection.getChildItems();
    }
}

/**
 * Find many items by a (possibly incomplete) parsed easy key.
 */
function easyKeySearch(parsedKey) {
    let s = new z.Search();
    s.addCondition("creator", "contains", parsedKey.creator);
    if (parsedKey.title != null) {
        s.addCondition("title", "contains", parsedKey.title);
    }
    if (parsedKey.date != null) {
        s.addCondition("date", "is", parsedKey.date);
    }
    return runSearch(s);
}

/**
 * Find a single item by its easy key, caching the result.
 */
function findByEasyKey(key) {
    if (knownEasyKeys[key]) {
        return knownEasyKeys[key];
    } else {
        let parsedKey = parseEasyKey(key);
        if (!parsedKey) {
            throw {'name': "EasyKeyError", "message": "EasyKey must be of the form DoeTitle2000 or doe:2000title"};
        } else {
            /* first try raw search */
            let rawResults = rawSearch(key);
            if (rawResults.length > 0) {
                return rawResults[0];
            } else {
                let results = easyKeySearch(parsedKey);
                if (results.length == 0) {
                    throw {'name': "EasyKeyError", "message": "search failed to return a single item"};
                } else if (results.length > 1) {
                    throw {'name': "EasyKeyError", "message": "search return multiple items"};
                } else {
                    knownEasyKeys[key] = results[0];
                    return results[0];
                }
            }
        }
    }
}

/**
 * Map the easykeys in the citations to ids.
 */
function processCitationsGroup (citationGroup) {
    function processCitationItem (citation) {
        let retval = {};
        for (let x in citation) {
            if (x == "easyKey") {
                retval.id = findByEasyKey(citation[x]).id;
            } else {
                retval[x] = citation[x];
            }
        }
        return retval;
    }
    let citationItems = citationGroup.citationItems.map(processCitationItem);
    return { 
        "properties" : citationGroup.properties,
        "citationItems" : citationItems
    };
}

/**
 * Extract the ids from an array of citationGroups.
 */
function extractIds (citationGroups) {
    let ids = [];
    citationGroups.map (function(group) {
        group.citationItems.map (function(citationItem) {
            ids.push(citationItem.id);
        });
    });
    return ids;
}

function myExport (items, translatorId, successCallback, failureCallback) {
    let translation = new z.Translate.Export;
    translation.setItems(items);
    translation.setTranslator(translatorId);
    translation.setHandler("done", function (obj, worked) {
        if (worked) {
            successCallback(obj.string);
        } else {
            failureCallback();
        }
    });
    translation.translate();
    return;
}

function makeEasyKeys (items, successCallback, failureCallback) {
    return myExport(items, easyKeyExporterMetadata.translatorID, successCallback, failureCallback);
}

function search (query) {
    let s = new z.Search();
    s.addCondition('joinMode', 'any');
    s.addCondition("quicksearch-titleCreatorYear", "contains", query);
    return runSearch(s);
}

function handleResponseFormat(format, style, items, sendResponseCallback) {
    if (format == 'key') {
        let responseData = items.map (function (item) {
            return ((item.libraryID || "0") + "_" + item.key);
        });
        sendResponseCallback(200, "application/json; charset=UTF-8", 
                             JSON.stringify(responseData, null, "  "));
    } else if (format == 'bibliography') {
        let responseData = items.map (function (item) {
            // TODO - make the default style correct
            style = style || "http://www.zotero.org/styles/chicago-note-bibliography";
            let data = z.QuickCopy.getContentFromItems(new Array(item), "bibliography=" + style);
            // attach key to bibliography
            data['key'] = ((item.libraryID || "0") + "_" + item.key);
            // strip newlines
            data['text'] = data['text'].replace(/(\r\n|\n|\r)/gm,"");
            return data;
        });
        sendResponseCallback(200, "application/json; charset=UTF-8",
                             JSON.stringify(responseData, null, "  "));
    } else if (format == 'bibtex') {
        myExport(items, "9cb70025-a888-4a29-a210-93ec52da40d4",
                 function (output) {
                     sendResponseCallback(200, "text/plain; charset=UTF-8", output);
                 },
                 function () {
                     sendResponseCallback(400);
                 });
    } else if (format == 'recoll') {
        let responseData = [];
        for (let i in items) {
            let item = items[i];
            if (item.isRegularItem()) {
                let attachments = item.getAttachments(false);
                let attachmentPaths = [];
                for (let a in attachments) {
                    let attachment = z.Items.get(attachments[a]);
                    if (attachment.isAttachment()) {
                        let path = attachment.getFile().path;
                        if (path) {
                            attachmentPaths.push(path);
                        }
                    }
                }
                let creators = item.getCreators().map (function (c) {
                    return c.ref.firstName + " " + c.ref.lastName;
                });
                responseData.push({"key": ((item.libraryID || "0") + "_" + item.key),
                                   "creators": creators,
                                   "modified": z.Date.dateToISO(z.Date.sqlToDate(item.dateModified)),
                                   "title": item.getField('title'),
                                   "paths": attachmentPaths});
            }
        }
        sendResponseCallback(200, "application/json; charset=UTF-8",
                             JSON.stringify(responseData, null, "  "));
    } else if (format == "easykey") {
        makeEasyKeys(items, 
                     /* success */
                     function (rawKeys) {
                         let keys = rawKeys.split(" ");
                         // remove leading @
                         let keys2 = keys.map(function(key) { return key.substring(1); });
                         sendResponseCallback(200, "application/json", JSON.stringify(keys2, null, "  "));
                     }, 
                     /* failure */
                     function () {
                         sendResponseCallback(400);
                     });
    } else {
        let itemGetter = new z.Translate.ItemGetter();
        itemGetter.setItems(items);
        let responseData = [];
        while((item = itemGetter.nextItem())) {
            responseData.push(z.Utilities.itemToCSLJSON(item));
        }
        sendResponseCallback(200, "application/json; charset=UTF-8", 
                             JSON.stringify(responseData, null, "  "));
    }
}

let bibliographyEndpoint = function (url, data, sendResponseCallback) {
    let q = cleanQuery(url['query']);
    let cslEngine = makeCslEngine(data.styleId);
    if (!cslEngine) {
        sendResponseCallback(400, "text/plain", "No style found.");
        return;
    } else {
        //zotero.localItems = {};
        cslEngine.setOutputFormat("html");
        try {
            let citationGroups = data.citationGroups.map(processCitationsGroup);
            cslEngine.updateItems(extractIds(citationGroups));
            let retval = {};
            retval.bibliography = cslEngine.makeBibliography();
            retval.citationClusters = [];
            citationGroups.map (function (citationGroup) {
                retval.citationClusters.push(cslEngine.appendCitationCluster(citationGroup, true)[0][1]);
            });
            sendResponseCallback(200, "application/json", JSON.stringify(retval, null, "  "));
            return;
        } catch (ex if (ex.name === "EasyKeyError")) {
            sendResponseCallback(400, "text/plain", ex.message);
        }
    }
};

let completeEndpoint = function (url, data, sendResponseCallback) {
    let q = cleanQuery(url['query']);
    if (q.easykey) {
        let items = easyKeySearch(parseEasyKey(q.easykey));
        if (!items) {
            sendResponseCallback(400, "text/plain", "EasyKey must be of the form DoeTitle2000 or doe:2000title");
        } else {
            handleResponseFormat("easykey", null, items, sendResponseCallback);
        }
    }
};

let searchEndpoint = function (url, data, sendResponseCallback) {
    let q = cleanQuery(url['query']);
    if (q.q) {
        let results = search(q.q);
        handleResponseFormat(q.format, q.style, results, sendResponseCallback);
    } else {
        sendResponseCallback(400, "text/plain", "q param required.");
    }
};

let itemsEndpoint = function (url, data, sendResponseCallback) {
    let q = cleanQuery(url['query']);
    let items = [];
    if (q.selected) {
        let ZoteroPane = Components.classes["@mozilla.org/appshell/window-mediator;1"].
            getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("navigator:browser").ZoteroPane;
        items = ZoteroPane.getSelectedItems();
        if (!items) { items = []; }
    } else if (q.collection) {
        items = collectionSearch(q.collection);
    } else if (q.key) {
        items = q.key.split(",").map(function (key) {
            let lkh = z.Items.parseLibraryKeyHash(key);
            var retval = z.Items.getByLibraryAndKey(lkh.libraryID, lkh.key);
            if (retval == false) {
                return sendResponseCallback(400, "text/plain", "item with key " + key + " not found!");
            } else {
                return retval;
            }
        });
    } else if (q.easykey) {
        try {
            items = q.easykey.split(",").map(function (key) {
                return findByEasyKey(key);
            });
        } catch (ex if (ex.name === "EasyKeyError")) {
            sendResponseCallback(400, "text/plain", ex.message);
            return;
        }
    } else if (q.all) {
        var items = z.Items.getAll();
    } else {
        sendResponseCallback(400, "text/plain", "No param supplied!");
    }
    handleResponseFormat(q.format, q.style, items, sendResponseCallback);
    return;
};

let endpoints = {
    "bibliography" : {
        supportedMethods:  ["POST"],
        supportedDataTypes: ["application/json"],
        init : bibliographyEndpoint
    },
    "complete" : {
        supportedMethods: ["GET"],
        supportedDataType : ["application/x-www-form-urlencoded"],
        init : completeEndpoint
    },
    "search" : {
        supportedMethods: ["GET"],
        supportedDataType : ["application/x-www-form-urlencoded"],
        init : searchEndpoint
    },
    "items" : {
        supportedMethods:["GET"],
        supportedDataType : ["application/x-www-form-urlencoded"],
        init : itemsEndpoint
    }
};

/**
 * Function to load our endpoints into the Zotero connector server.
 */
function loadEndpoints () {
    loadZotero();
    for (let e in endpoints) {
        let ep = z.Server.Endpoints["/zotxt/" + e] = function() {};
        ep.prototype = endpoints[e];
    }
}

let observerService = Components.classes["@mozilla.org/observer-service;1"].
    getService(Components.interfaces.nsIObserverService);

let observer = {
    "observe": function(subject, topic, data) { 
        loadEndpoints(); 
    }
};

function startup(data, reason) {
    /* wait until after zotero is loaded */
    observerService.addObserver(observer, "final-ui-startup", false);
}


function shutdown (data, reason) {
    observerService.removeObserver(observer, "final-ui-startup");
}

function uninstall(data, reason) {
    /* TODO uninstall exporters? */
}


function installTranslator(metadata, filename) {
    loadZotero(); 
    let file = FileUtils.getFile('ProfD', ['extensions', 'zotxt@e6h.org',
                                           'resource', 'translators', filename]);
    NetUtil.asyncFetch(file, function(inputStream, status) {
        if (!Components.isSuccessCode(status)) {
            z.debug("error reading file");
            return;
        }

        let data = NetUtil.readInputStreamToString(inputStream, inputStream.available());
        z.Translators.save(metadata, data);
        z.Translators.init();
    });
}

function install(data, reason) {
    Components.utils.import("resource://gre/modules/FileUtils.jsm");
    Components.utils.import("resource://gre/modules/NetUtil.jsm");

    /* turn on http server if it is not on */
    /* TODO turn this off when uninstalled? */
    let prefs = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefService).getBranch("extensions.zotero.");
    prefs.setBoolPref("httpServer.enabled", true);
    loadEndpoints(); 

    /* load exporters */
    installTranslator(easyKeyExporterMetadata, "EasyKeyExporter.js");
}