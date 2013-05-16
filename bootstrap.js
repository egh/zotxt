Components.utils.import("resource://gre/modules/Services.jsm");
var z;
var console = Services.console;

/**
 * Proxy sys item for passing in to citeproc. Wraps the
 * zotero.Cite.System object, but allows for locally registered items.
 */
var mySys = {
    retrieveLocale : function (lang) {
        return zotero.Cite.System.retrieveLocale(lang);
    },
    retrieveItem : function(id) { 
        if (zotero.localItems[id] != undefined) {
            return zotero.localItems[id];
        } else { 
            return zotero.Cite.System.retrieveItem(id);
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

function findByDynamicKey(key) {
    var re = new RegExp("^([A-Z][a-z]+)([A-Z][a-z]+)?([0-9]+)?");
    var result = re.exec(key);
    if (result) {
        var creator = result[1];
        var title = result[2];
        var date = result[3];
        
        var s = new z.Search();
        s.addCondition("creator", "contains", creator);
        if (title != null) {
        s.addCondition("title", "contains", title);
        }
        if (date != null) {
            s.addCondition("date", "is", date);
        }
        var i = s.search();
        if (!i) {
            return null;
        } else if (i.length == 0) {
            return null;
        } else if (i.length > 1) {
            throw {'name': "TooManyResults", "message": "search failed to return a single item"};
        } else {
            return z.Items.get(i[0]);
        }
    }
}

var endpoints = {
    "bibliography" : {
        "supportedMethods":  ["POST"],
        "supportedDataTypes": ["application/json"],
        "init": function (url, data, sendResponseCallback) {
            var cslEngine = makeCslEngine(data["styleId"]);
            if (!cslEngine) {
                sendResponseCallback(400, "text/plain", "No style found.");
            } else {
                //zotero.localItems = {};
                cslEngine.setOutputFormat("html");
                function flatten(a) {
                    return [].concat.apply([], a);
                }
                var citations = data["citations"];
                var citationItems = citations.map(function (c) { 
                    return c["citationItems"]; 
                });
                var citationIds = flatten(citationItems).map (function (c) { 
                    return c["id"];
                });
                var keys = flatten(citationIds);
                var items = keys.map(findByDynamicKey);
                var ids = items.map(function(c){ return c.id; });
                cslEngine.updateItems(ids);
            }
        }
    },
    "item" : {
	"supportedMethods":["GET"],
        "supportedDataType" : ["application/x-www-form-urlencoded"],
        "init" : function (url, data, sendResponseCallback) {
            var q = url['query'];
            var itemId = null;
            if (q["itemId"]) {
                itemId = null;
            } else if (q["creator"]) {
                var creator = q["creator"];
                var title = q["title"];
                var date = q["date"];
                var item = findByDynamicKey(creator, title, date);
                if (item === null) {
                    sendResponseCallback(404);
                } else {
                    sendResponseCallback(200, "application/json", JSON.stringify(z.Utilities.itemToCSLJSON(item)));
                }
            } else {
                sendResponseCallback(500);
            }
        }
    }
}

/**
 * Function to load our endpoints into the Zotero connector server.
 */
function loadEndpoints () {
    z = Components.classes["@zotero.org/Zotero;1"].
        getService(Components.interfaces.nsISupports).wrappedJSObject;
    
    for (e in endpoints) {
        var ep = z.Server.Endpoints["/zotxt/" + e] = function() {};
        ep.prototype = endpoints[e];
    }
}
    
function startup(data, reason) {
    var observerService = Components.classes["@mozilla.org/observer-service;1"].
        getService(Components.interfaces.nsIObserverService);
    observerService.addObserver({"observe": function(subject, topic, data) { loadEndpoints(); } },
                                "final-ui-startup", false);
}


function shutdown (data, reason) {
    /* pass */
}

function uninstall(data, reason) {
    /* pass */
}

function install(data, reason) {
    /* turn on http server if it is not on */
    /* TODO turn this off when uninstalled? */
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefService).getBranch("extensions.zotero.");
    prefs.setBoolPref("httpServer.enabled", true);
}
