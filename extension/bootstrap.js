Components.utils.import("resource://gre/modules/Services.jsm");
var z;
var console = Services.console;

var easyKeyExporterMetadata = {
    "translatorID":"9d774afe-a51d-4055-a6c7-23bc96d19fe7",
    "label": "EasyKey",
    "creator": "Erik Hetzner",
    "target": "txt",
    "minVersion": "2.1.9",
    "maxVersion": "",
    "priority": 200,
    "inRepository": false,
    "translatorType": 2,
    "browserSupport": "gcs",
    "lastUpdated":"2013-06-10 12:02:17"
};

function loadZotero () {
    if (!z) {
        z = Components.classes["@zotero.org/Zotero;1"].
            getService(Components.interfaces.nsISupports).wrappedJSObject;
    }
}

/**
 * Proxy sys item for passing in to citeproc. Wraps the
 * zotero.Cite.System object, but allows for locally registered items.
 */
var mySys = {
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
    var style = z.Styles.get(styleId);
    if (!style) {
        return null;
    } else {
        return style.getCiteProc(true);
    }
}

var knownEasyKeys = {};

var easyKeyRe = new RegExp("^([A-Z][a-z]+)([A-Z][a-z]+)?([0-9]+)?");
var alternateEasyKeyRe = new RegExp("^([a-z]+):([0-9]+)?([a-z]+)?");

/**
 * Parses an easy key. Returns {creator: ..., title: ..., date: ...} or null if it
 * did not parse correctly.
 */
function parseEasyKey(key) {
    var result = easyKeyRe.exec(key);
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

/**
 * Find many items by a (possibly incomplete) parsed easy key.
 */
function easyKeySearch(parsedKey) {
    var s = new z.Search();
    s.addCondition("creator", "contains", parsedKey.creator);
    if (parsedKey.title != null) {
        s.addCondition("title", "contains", parsedKey.title);
    }
    if (parsedKey.date != null) {
        s.addCondition("date", "is", parsedKey.date);
    }
    var i = s.search();
    if (!i) {
        return [];
    } else if (i.length == 0) {
        return [];
    } else {
        return i.map(function(id) { return z.Items.get(id); });
    }
}

/**
 * Find a single item by its easy key, caching the result.
 */
function findByEasyKey(key) {
    if (knownEasyKeys[key]) {
        return knownEasyKeys[key];
    } else {
        var parsedKey = parseEasyKey(key);
        if (!parsedKey) {
            throw {'name': "EasyKeyError", "message": "EasyKey must be of the form DoeTitle2000 or doe:2000title"};
        } else {
            let results = easyKeySearch(parsedKey);
            if (results.length == 0 ) {
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

/**
 * Map the easykeys in the citations to ids.
 */
function processCitationsGroup (citationGroup) {
    function processCitationItem (citation) {
        var retval = {};
        for (var x in citation) {
            if (x == "easyKey") {
                retval.id = findByEasyKey(citation[x]).id;
            } else {
                retval[x] = citation[x];
            }
        }
        return retval;
    }
    var citationItems = citationGroup.citationItems.map(processCitationItem);
    return { 
        "properties" : citationGroup.properties,
        "citationItems" : citationItems
    };
}

/**
 * Extract the ids from an array of citationGroups.
 */
function extractIds (citationGroups) {
    var ids = [];
    citationGroups.map (function(group) {
        group.citationItems.map (function(citationItem) {
            ids.push(citationItem.id);
        });
    });
    return ids;
}

var endpoints = {
    "bibliography" : {
        "supportedMethods":  ["POST"],
        "supportedDataTypes": ["application/json"],
        "init": function (url, data, sendResponseCallback) {
            var cslEngine = makeCslEngine(data.styleId);
            if (!cslEngine) {
                sendResponseCallback(400, "text/plain", "No style found.");
                return;
            } else {
                //zotero.localItems = {};
                cslEngine.setOutputFormat("html");
                try {
                    var citationGroups = data.citationGroups.map(processCitationsGroup);
                    cslEngine.updateItems(extractIds(citationGroups));
                    var retval = {};
                    retval.bibliography = cslEngine.makeBibliography();
                    retval.citationClusters = [];
                    citationGroups.map (function (citationGroup) {
                        retval.citationClusters.push(cslEngine.appendCitationCluster(citationGroup, true)[0][1]);
                    });
                    sendResponseCallback(200, "application/json", JSON.stringify(retval));
                    return;
                } catch (ex if (ex.name === "EasyKeyError")) {
                    sendResponseCallback(400, "text/plain", ex.message);
                }
            }
        }
    },
    "items" : {
	"supportedMethods":["GET"],
        "supportedDataType" : ["application/x-www-form-urlencoded"],
        "init" : function (url, data, sendResponseCallback) {
            var q = url['query'];
            var items = [];
            if (q.selected) {
                var ZoteroPane = Components.classes["@mozilla.org/appshell/window-mediator;1"].
                  getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("navigator:browser").ZoteroPane;
                items = ZoteroPane.getSelectedItems();
                if (!items) { items = []; }
            } else if (q.key) {
                items = q.key.split(",").map(function (key) {
                    var lkh = z.Items.parseLibraryKeyHash(key);
                    return z.Items.getByLibraryAndKey(lkh.libraryID, lkh.key);
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
            } else {
                sendResponseCallback(400, "text/plain", "No param supplied!");
                return;
            }
            if (q['format'] == 'key') {
                var responseData = items.map (function (item) {
                    return ((item.libraryID || "0") + "_" + item.key);
                });
                sendResponseCallback(200, "application/json; charset=UTF-8", 
                                     JSON.stringify(responseData));
                return;
            } else if (q['format'] == 'bibliography') {
                var responseData = items.map (function (item) {
                    // TODO - make the default style correct
                    var style = q['style'] || "http://www.zotero.org/styles/chicago-note-bibliography"
                    return z.QuickCopy.getContentFromItems(new Array(item), "bibliography=" + style);
                });
                sendResponseCallback(200, "application/json; charset=UTF-8",
                                     JSON.stringify(responseData));
                return;
            } else {
                var responseData = items.map (function (item) {
                    return z.Utilities.itemToCSLJSON(item);
                });
                sendResponseCallback(200, "application/json; charset=UTF-8", 
                                     JSON.stringify(responseData));
                return;
            }
        }
    }
}

/**
 * Function to load our endpoints into the Zotero connector server.
 */
function loadEndpoints () {
    loadZotero();
    for (e in endpoints) {
        var ep = z.Server.Endpoints["/zotxt/" + e] = function() {};
        ep.prototype = endpoints[e];
    }
}
    
function startup(data, reason) {
    /* wait until after zotero is loaded */
    var observerService = Components.classes["@mozilla.org/observer-service;1"].
        getService(Components.interfaces.nsIObserverService);
    observerService.addObserver(
        { 
            "observe": function(subject, topic, data) { 
                loadEndpoints(); 
            }
        },
        "final-ui-startup", false);
}


function shutdown (data, reason) {
    /* pass */
}

function uninstall(data, reason) {
    /* TODO uninstall exporters? */
}


function installTranslator(metadata, filename) {
    loadZotero(); 
    var file = FileUtils.getFile('ProfD', ['extensions', 'zotxt@e6h.org',
                                           'resource', 'translators', filename]);
    NetUtil.asyncFetch(file, function(inputStream, status) {
        if (!Components.isSuccessCode(status)) {
            z.debug("error reading file");
            return;
        }

        var data = NetUtil.readInputStreamToString(inputStream, inputStream.available());
        z.Translators.save(metadata, data);
        z.Translators.init();
    });
}

function install(data, reason) {
    Components.utils.import("resource://gre/modules/FileUtils.jsm");
    Components.utils.import("resource://gre/modules/NetUtil.jsm");

   /* turn on http server if it is not on */
    /* TODO turn this off when uninstalled? */
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefService).getBranch("extensions.zotero.");
    prefs.setBoolPref("httpServer.enabled", true);
    loadEndpoints(); 

    /* load exporters */
    installTranslator(easyKeyExporterMetadata, "EasyKeyExporter.js");
}