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

/* global Components, Set, FileUtils, NetUtil, Q, parseEasyKey, runSearch, buildRawSearch, buildEasyKeySearch, findByKey, cleanQuery, buildSearch, makeCslEngine */
'use strict';

Components.utils.import('resource://gre/modules/Services.jsm');

var Zotero;
var uuidRe = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}/;
var timer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);

let easyKeyExporterMetadata = {
    'translatorID':'9d774afe-a51d-4055-a6c7-23bc96d19fe7',
    'label': 'Easy Citekey',
    'creator': 'Erik Hetzner',
    'target': 'txt',
    'minVersion': '2.1.9',
    'maxVersion': '',
    'priority': 200,
    'inRepository': false,
    'translatorType': 2,
    'browserSupport': 'gcs',
    'displayOptions': {
        'Alternate (@DoeTitle2000)': false
    },
    'lastUpdated':'2013-07-15 07:03:17'
};

const jsonMediaType = 'application/json; charset=UTF-8';
const textMediaType = 'text/plain';
const badRequest = 400;

function loadZotero () {
    let callback = function (resolve, reject) {
        if (!Zotero) {
            if (!("@zotero.org/Zotero;1" in Components.classes)) {
                return timer.initWithCallback(function () {
                    return callback(resolve, reject);
                }, 10000, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
            } else {
                Zotero = Components.classes["@zotero.org/Zotero;1"]
                    .getService(Components.interfaces.nsISupports).wrappedJSObject;
                return resolve(Zotero);
            }
        } else {
            return resolve(Zotero);
        }
    };
    return new Promise(callback);
}

let knownEasyKeys = {};

function getCollection(name, collections) {
    if (!collections) {
        return getCollection(name, Zotero.getCollections(null));
    } else {
        for (let collection of collections) {
            if (collection.name === name) {
                return collection;
            } else {
                if (collection.hasChildCollections) {
                    let retval = getCollection(name, Zotero.getCollections(collection.id));
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
 * Find a single item by its easy key, caching the result.
 */
function findByEasyKey(key) {
    if (knownEasyKeys[key]) {
        return new Promise(function (resolve, reject) { return resolve(knownEasyKeys[key]); });;
    } else {
        let parsedKey = parseEasyKey(key, Zotero);
        if (!parsedKey) {
            return new Promise(function (resolve, reject) {
                reject({'name': 'EasyKeyError', 'message': 'EasyKey must be of the form DoeTitle2000 or doe:2000title'});
            });
        } else {
            /* first try raw search */
            return runSearch(buildRawSearch(new Zotero.Search(), key), Zotero).then(function(items) {
                if (items.length > 0) {
                    return items;
                } else {
                    return runSearch(buildEasyKeySearch(new Zotero.Search(), parsedKey), Zotero);
                }
            }).then (function (items) {
                if (items.length === 0) {
                    throw {'name': 'EasyKeyError', 'message': 'search failed to return a single item'};
                } else if (items.length > 1) {
                    throw {'name': 'EasyKeyError', 'message': 'search return multiple items'};
                } else {
                    knownEasyKeys[key] = items[0];
                    return items[0];
                }
            });
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
            if (x === 'easyKey') {
                retval.id = findByEasyKey(citation[x]).id;
            } else if (x === 'key') {
                retval.id = findByKey(citation[x], Zotero).id;
            } else {
                retval[x] = citation[x];
            }
        }
        return retval;
    }
    let citationItems = citationGroup.citationItems.map(processCitationItem);
    return {
        'properties' : citationGroup.properties,
        'citationItems' : citationItems
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

function myExport (items, translatorId) {
    let translation = new Zotero.Translate.Export();
    translation.setItems(items);
    translation.setTranslator(translatorId);
    if (Zotero.BetterBibTeX && (translatorId === Zotero.BetterBibTeX.Translators.getID('BetterBibTeX Quick Copy'))) {
      translation.setDisplayOptions({quickCopyMode: 'pandoc'});
    }
    /* I don't understand why Zotero still has `setHandler` now that we are in
     * promise-land, but OK */
    let callback = function (resolve, reject) {
        translation.setHandler("done", function (obj, worked) {
            if (worked) {
                resolve(obj.string);
            } else {
                reject();
            }
        });
    };
    let promise = new Promise(callback);
    translation.translate();
    return promise;
}

const mkFormatter = (format, style) => (items) => handleResponseFormat(format, style, items);

    if (format === 'key') {
        return [200, 'application/json', JSON.stringify(items.map(item2key), null, '  ')];
    } else if (format === 'bibliography') {
        let csl = makeCslEngine(style, Zotero);
        let responseData = items.map (function (item) {
            csl.updateItems([item.id], true);
            return {
                'key': ((item.libraryID || '0') + '_' + item.key),
                'html': Zotero.Cite.makeFormattedBibliography(csl, 'html'),
                // strip newlines
                'text': Zotero.Cite.makeFormattedBibliography(csl, 'text')
                    .replace(/(\r\n|\n|\r)/gm,'')
            };
        });
        return [200, jsonMediaType, JSON.stringify(responseData, null, '  ')];
    } else if (format === 'bibtex' || (format && format.match(uuidRe))) {
        /* return raw export data */
        let translatorId = null;
        if (format === 'bibtex') {
            translatorId = '9cb70025-a888-4a29-a210-93ec52da40d4';
        } else {
            translatorId = format;
        }
        myExport(items, translatorId,
                 function (output) {
                     sendResponseCallback(200, 'text/plain; charset=UTF-8', output);
                 },
                 function () {
                     sendResponseCallback(400);
                 });
    } else if (format === 'quickBib') {
        let responseData = [];
        for (let item of items) {
            if (item.isRegularItem()) {
                let creators = item.getCreators();
                let creatorString = "";
                if (creators.length > 0) {
                    creatorString = creators[0].ref.lastName + ', ' + creators[0].ref.firstName;
                }
                if (creators.length > 1) {
                    creatorString += ", et al.";
                }
                responseData.push({'key': ((item.libraryID || '0') + '_' + item.key),
                                   'quickBib': creatorString + ' - ' + item.getField('date',true).substr(0, 4) + ' - ' + item.getField('title')});
function handleResponseFormat(format, style, itemPromises) {
    return Promise.all(itemPromises).then((items) => {
            }
        }
        sendResponseCallback(200, jsonMediaType,
                             JSON.stringify(responseData, null, '  '));

    } else if (format === 'paths') {
        let promises = [];
        let responseData = [];
        for (let item of items) {
            if (item.isRegularItem()) {
                let attachments = item.getAttachments(false);
                let attachmentPaths = [];
                let itemPromises = [];
                for (let attachmentId of attachments) {
                    let attachment = Zotero.Items.get(attachmentId);
                    if (attachment.isAttachment()) {
                        let path = attachment.getFile().path;
                        if (path) {
                            attachmentPaths.push(path);
                        } else {
                            /* Need to download from storage */
                            let promise = Q.fcall(function () {
                                return Zotero.Sync.Storage.downloadFile(attachment);
                                                                 // { onProgress: function () {} });
                            }).then(function () {
                                attachmentPaths.push(attachment.getFile().path);
                            });
                            itemPromises.push(promise);
                            promises.push(promise);
                        }
                    }
                }
                Q.allResolved(itemPromises).then(function () {
                    responseData.push({'key': ((item.libraryID || '0') + '_' + item.key),
                                       'paths': attachmentPaths});
                });
            }
        }
        Q.allResolved(promises).then(function () {
            sendResponseCallback(200, jsonMediaType,
                                 JSON.stringify(responseData, null, '  '));
        });
    } else if (format === 'easykey' || format === 'betterbibtexkey') {
        let translatorId = null;
        if (format === 'easykey') {
            translatorId = easyKeyExporterMetadata.translatorID;
        } else {
            if (!Zotero.BetterBibTeX) {
                return [badRequest, textMediaType, 'BetterBibTex not installed.'];
            } else {
                translatorId = Zotero.BetterBibTeX.Translators.getID('BetterBibTeX Quick Copy');
            }
        }
        if (items.length === 0) {
            return [200, 'application/json', JSON.stringify([], null, '  ')];
        } else {
            return myExport(items, translatorId).then(function(rawKeys) {
                let keys = rawKeys.split(' ');
                // remove leading @
                let keys2 = keys.map(function(key) { return key.replace(/[\[\]@]/g, ''); });
                return [200, jsonMediaType, JSON.stringify(keys2, null, '  ')];
            }).catch(function() {
                return [badRequest];
            });
        }
    } else {
        /* Use BetterBibTeX JSON if available */
        if (Zotero.BetterBibTeX) {
            let translatorId = Zotero.BetterBibTeX.Translators.getID('Better CSL JSON');
            return myExport(items, translatorId).then(function (output) {
                return [200, 'text/plain; charset=UTF-8', output];
            });
        } else {
            let itemGetter = new Zotero.Translate.ItemGetter();
            itemGetter.setItems(items);
            let responseData = [];
            let item;
            while((item = itemGetter.nextItem())) {
                responseData.push(Zotero.Utilities.itemToCSLJSON(item));
            }
            return [200, jsonMediaType, JSON.stringify(responseData, null, '  ')];
        }
    }
    });
}

let bibliographyEndpoint = function (url, data, sendResponseCallback) {
    let cslEngine = makeCslEngine(data.styleId, Zotero);
    if (!cslEngine) {
        sendResponseCallback(400, textMediaType, 'No style found.');
        return;
    } else {
        //zotero.localItems = {};
        cslEngine.setOutputFormat('html');
        try {
            let citationGroups = data.citationGroups.map(processCitationsGroup);
            cslEngine.updateItems(extractIds(citationGroups));
            let retval = {};
            retval.bibliography = cslEngine.makeBibliography();
            retval.citationClusters = [];
            citationGroups.map (function (citationGroup) {
		cslEngine.appendCitationCluster(citationGroup).map(function(updated) {
		    retval.citationClusters[updated[0]] = updated[1];
		});
	    });
            sendResponseCallback(200, jsonMediaType, JSON.stringify(retval, null, '  '));
            return;
        } catch (ex if (ex.name === 'EasyKeyError')) {
            sendResponseCallback(400, textMediaType, ex.message);
        }
    }
};

let completeEndpoint = function (options) {
    if (!options.query.easykey) {
        return [badRequest, textMediaType, 'Option easykey is required.'];
    } else {
        let q = cleanQuery(options.query);
        return runSearch(buildEasyKeySearch(new Zotero.Search(), parseEasyKey(q.easykey, Zotero)), Zotero).then(function (items) {
            if (!items) {
                return [badRequest, textMediaType, 'EasyKey must be of the form DoeTitle2000 or doe:2000title'];
            } else {
                return handleResponseFormat('easykey', null, items);
            }
        });
    }
};

const searchEndpoint = function (options) {
    const query = cleanQuery(options.query);
    if (query.q) {
        let format = mkFormatter(query.format, query.style);
        let search = buildSearch(new Zotero.Search(), query.q, query.method);
        return runSearch(search, Zotero).then(format);
    } else {
        return [badRequest, textMediaType, 'q param required.'];
    }
};

let itemsEndpoint = function (options) {
    const q = cleanQuery(options.query);
    let items = [];
    const format = mkFormatter(q.format, q.style);
    if (q.selected) {
        let ZoteroPane = Components.classes['@mozilla.org/appshell/window-mediator;1'].
                getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow('navigator:browser').ZoteroPane;
        items = ZoteroPane.getSelectedItems();
        if (!items) { items = []; }
    } else if (q.collection) {
        items = collectionSearch(q.collection);
    } else if (q.key) {
        items = q.key.split(',').map(function (key) {
            let retval = findByKey(key, Zotero);
            if (retval === false) {
                return [badRequest, textMediaType, 'item with key ' + key + ' not found!'];
            } else {
                return retval;
            }
        });
    } else if (q.easykey) {
        return Promise.all(q.easykey.split(',').map(findByEasyKey))
            .then(format)
            .catch((ex) => [badRequest, textMediaType, ex.message]);
    } else if (q.betterbibtexkey) {
        let keys = q.betterbibtexkey.split(',');
        if (!Zotero.BetterBibTeX) {
            return [badRequest, textMediaType, 'BetterBibTex not installed.'];
        }
        let results = Zotero.BetterBibTeX.DB.keys.findObjects({citekey: { '$in': keys }, libraryID: null});
        if (results) {
            items = results.map(function (result) {
                return Zotero.Items.get(result.itemID);
            });
        }
    } else if (q.all) {
        return Zotero.Items.getAll(Zotero.Libraries.userLibraryID).then(format);
    } else {
        return [badRequest, textMediaType, 'No param supplied!'];
    }
};

let selectEndpoint = function (options) {
    let ZoteroPane = Components.classes['@mozilla.org/appshell/window-mediator;1'].
            getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow('navigator:browser').ZoteroPane;
    ZoteroPane.show();
    let q = cleanQuery(options.query);
    let promise = null;
    if (q.easykey) {
        promise = findByEasyKey(q.easykey);
    } else if (q.key) {
        promise = findByKey(q.key, Zotero);
    } else {
        return [badRequest, textMediaType, 'No param supplied!'];
    }
    return promise.then(function(item) {
        if (item === false) {
            return [badRequest, textMediaType, 'item with key ' + q.key + ' not found!'];
        }
        ZoteroPane.selectItem(item.id);
        return [200, jsonMediaType, JSON.stringify('success', null, '  ')];
    }).catch(function(ex) {
        return [badRequest, textMediaType, ex.message];
    });
};

/**
 * Function to load our endpoints into the Zotero connector server.
 */
function loadEndpoints () {
    loadZotero().then(function () {
        let endpoints = {
            'complete' : {
                supportedMethods: ['GET'],
                supportedDataType : ['application/x-www-form-urlencoded'],
                init : completeEndpoint
            },
            'search' : {
                supportedMethods: ['GET'],
                supportedDataType : ['application/x-www-form-urlencoded'],
                init : searchEndpoint
            },
            'items' : {
                supportedMethods:['GET'],
                supportedDataType : ['application/x-www-form-urlencoded'],
                init : itemsEndpoint
            },
            'select' : {
                supportedMethods:['GET'],
                supportedDataType : ['application/x-www-form-urlencoded'],
                init : selectEndpoint
            }
        };
        for (let e in endpoints) {
            let ep = Zotero.Server.Endpoints['/zotxt/' + e] = function() {};
            ep.prototype = endpoints[e];
        }
    });
}

let observerService = Components.classes['@mozilla.org/observer-service;1'].
        getService(Components.interfaces.nsIObserverService);

let startupObserver = {
    'observe': function(subject, topic, data) {
        loadZotero().then(function () {
            Components.utils.import('resource://gre/modules/FileUtils.jsm');
            Components.utils.import('resource://gre/modules/NetUtil.jsm');

            /* turn on http server if it is not on */
            /* TODO turn this off when uninstalled? */
            let prefs = Components.classes['@mozilla.org/preferences-service;1']
                .getService(Components.interfaces.nsIPrefService).getBranch('extensions.zotero.');
            prefs.setBoolPref('httpServer.enabled', true);

            /* load exporters */
            // installTranslator(easyKeyExporterMetadata, 'EasyKeyExporter.js');

            loadEndpoints();
        });
    }
};

function startup(data, reason) {
    /* wait until after zotero is loaded */
    observerService.addObserver(startupObserver, 'final-ui-startup', false);
    Components.utils.import('chrome://zotxt/content/modules/Core.jsm');
}


function shutdown (data, reason) {
    observerService.removeObserver(startupObserver, 'final-ui-startup');
}

function uninstall(data, reason) {
    /* TODO uninstall exporters? */
}

function installTranslator(metadata, filename) {
    let file = FileUtils.getFile('ProfD', ['extensions', 'zotxt@e6h.org',
                                           'resource', 'translators', filename]);
    NetUtil.asyncFetch(file, function(inputStream, status) {
        if (!Components.isSuccessCode(status)) {
            Zotero.debug('error reading file');
            return;
        }

        let data = NetUtil.readInputStreamToString(inputStream, inputStream.available());
        Zotero.Translators.save(metadata, data);
        Zotero.Translators.init();
    });
}

function install(data, reason) {
    Components.utils.import('resource://gre/modules/FileUtils.jsm');
    Components.utils.import('resource://gre/modules/NetUtil.jsm');

    /* turn on http server if it is not on */
    /* TODO turn this off when uninstalled? */
    loadZotero().then(function () {
        let prefs = Components.classes['@mozilla.org/preferences-service;1']
            .getService(Components.interfaces.nsIPrefService).getBranch('extensions.zotero.');
        prefs.setBoolPref('httpServer.enabled', true);
        loadEndpoints();

        /* load exporters */
        installTranslator(easyKeyExporterMetadata, 'EasyKeyExporter.js');
    });
}
