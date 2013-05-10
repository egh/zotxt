var z;

function parseQueryString (s) {
    if (typeof s == "string" || (typeof s == "object" && s.constructor === String)) {
        return z.Server.decodeQueryString(s);
    } else {
        return s;
    }
}

var endpoints = {
    "item" : {
	"supportedMethods":["POST"],
        "supportedDataType" : ["application/x-www-form-urlencoded"],
        "init" : function (data, sendResponseCallback) {
            var q = parseQueryString(data);
            var itemId = null;
            if (q["itemId"]) {
                itemId = null;
            } else if (q["creator"]) {
                var creator = q["creator"];
                var title = q["title"];
                var date = q["date"];
                
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
                    sendResponseCallback(404);
                } else {
                    if (i.length == 0) {
                        sendResponseCallback(404);
                    } else if (i.length > 1) {
                        sendResponseCallback(500);
                    } else {
                        var item = z.Utilities.itemToCSLJSON(z.Items.get(i[0]));
                        sendResponseCallback(200, "application/json", JSON.stringify(item));
                    }
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
    Components.utils.import("resource://gre/modules/Services.jsm");
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
