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

/* global Components, Set, FileUtils, NetUtil, Q, parseEasyKey, runSearch, buildRawSearch, buildEasyKeySearch, findByKey, cleanQuery, buildSearch, makeCslEngine, findByEasyKey, findByBBTKey, jsonStringify, item2key, makeClientError, ClientError, ensureLoaded */
'use strict';

var Zotero;
var uuidRe = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}/;

const jsonMediaType = 'application/json; charset=UTF-8';
const textMediaType = 'text/plain; charset=UTF-8';
const badRequestCode = 400;
const okCode = 200;

function loadZotero () {
    let callback = function (resolve, reject) {
        if (!Zotero) {
            if (!("@zotero.org/Zotero;1" in Components.classes)) {
                let timer = Components.classes["@mozilla.org/timer;1"].createInstanceComponents.interfaces.nsITimer;
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

function collectionSearch(name) {
    let collections = Zotero.Collections.getByLibrary(Zotero.Libraries.userLibraryID, true);
    for (let collection of collections) {
        if (collection.name === name) {
            return Promise.resolve(collection.getChildItems());
        }
    }
    return makeClientError(`collection ${name} not found`);
}

function processCitationItem (citation) {
    let cloneButSetId = (item)=>{
        let retval = Object.assign({}, citation);
        retval.id = item.id;
        delete(retval.easyKey);
        delete(retval.key);
        return retval;
    };
    if ('easyKey' in citation) {
        return findByEasyKey(citation.easyKey, Zotero).then(cloneButSetId);
    } else if ('key' in citation) {
        return findByKey(citation.key, Zotero).then(cloneButSetId);
    } else {
        return Promise.resolve(citation);
    }
}

/**
 * Map the easykeys in the citations to ids.
 */
function processCitationsGroup (citationGroup) {
    let citationItems = citationGroup.citationItems.map(processCitationItem);
    return Promise.all(citationItems).then((items)=>{
        return {
            'properties': citationGroup.properties,
            'citationItems': items
        };
    });
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
    let callback = function (resolve, reject) {
        let translation = new Zotero.Translate.Export();
        translation.setItems(items);
        translation.setTranslator(translatorId);
        /* I don't understand why Zotero still has `setHandler` now that we are in
         * promise-land, but OK */
        translation.setHandler("done", function (obj, worked) {
            if (worked) {
                resolve(obj.string);
            } else {
                reject();
            }
        });
        if (translatorId === 'a515a220-6fef-45ea-9842-8025dfebcc8f') {
            translation.setDisplayOptions({quickCopyMode: 'citekeys'});
        }
        translation.translate();
    };
    let promise = new Promise(callback);
    return promise;
}

/**
 * Build a response based on items and a format parameter.
 */
function buildResponse(items, format, style) {
    return ensureLoaded(items, Zotero).then((items)=>{
        if (format === 'key') {
            return [okCode, 'application/json', jsonStringify(items.map(item2key))];
        } else if (format === 'easykey' || format == 'citekey' || format === 'betterbibtexkey') {
            return buildBBTKeyResponse(items);
        } else if (format === 'bibtex') {
            return buildBibTeXResponse(items);
        } else if (format === 'bibliography') {
            return buildBibliographyResponse(items, style);
        } else if (format === 'quickBib') {
            return buildQuickBibResponse(items, style);
        } else if (format === 'paths') {
            return buildPathsResponse(items, style);
        } else if (format && format.match(uuidRe)) {
            return buildExportResponse(items, format);
        } else {
            return buildJsonResponse(items);
        }
    });
}

function buildJsonResponse(items) {
    /* Use BetterBibTeX JSON if available */
    if (Zotero.BetterBibTeX) {
        return buildExportResponse(items, 'f4b52ab0-f878-4556-85a0-c7aeedd09dfc');
    } else {
        return buildExportResponse(items, 'bc03b4fe-436d-4a1f-ba59-de4d2d7a63f7');
    }
}

/**
 * Build a response of a set of citation keys based on a set of items and a
 * translatorId via the Zotero export process.
 */
function buildKeyResponse(items, translatorId) {
    if (items.length === 0) {
        return [okCode, 'application/json', jsonStringify([])];
    } else {
        return myExport(items, translatorId).then((rawKeys)=>{
            let keys = rawKeys.split(/[ ,]/);
            // remove leading @
            let keys2 = keys.map(function(key) { return key.replace(/[\[\]@]/g, ''); });
            return [okCode, jsonMediaType, jsonStringify(keys2)];
        });
    }
}

function buildBBTKeyResponse(items) {
    if (!Zotero.BetterBibTeX) {
        return makeClientError('BetterBibTex not installed.');
    } else {
        return buildKeyResponse(items, 'a515a220-6fef-45ea-9842-8025dfebcc8f');
    }
}

function buildExportResponse(items, translatorId) {
    return myExport(items, translatorId).then((data) => {
        return [okCode, textMediaType, data];
    });
}

function buildBibTeXResponse(items) {
    return buildExportResponse(items, '9cb70025-a888-4a29-a210-93ec52da40d4');
}

function buildBibliographyResponse(items, style) {
    let csl = makeCslEngine(style, Zotero);
    let responseData = items.map ((item)=>{
        csl.updateItems([item.id], true);
        return {
            'key': ((item.libraryID || '0') + '_' + item.key),
            'html': Zotero.Cite.makeFormattedBibliography(csl, 'html'),
            // strip newlines
            'text': Zotero.Cite.makeFormattedBibliography(csl, 'text').replace(/(\r\n|\n|\r)/gm,'')
        };
    });
    return [okCode, jsonMediaType, jsonStringify(responseData)];
}

function buildQuickBibResponse(items) {
    let responseData = [];
    for (let item of items) {
        if (item.isRegularItem()) {
            let creators = item.getCreators();
            let authors = [];
            for (let i=0; i<creators.length; i++) {
                if (creators[i].creatorTypeID == 1) {
                    authors.push(creators[i]);
                }
            }
            // only authors if there are any
            let creatorString = namesOrEtAl(authors) || namesOrEtAl(creators) || "N.A.";
            responseData.push({'key': ((item.libraryID || '0') + '_' + item.key),
                               'quickBib': creatorString + ' - ' + item.getField('date',true).substr(0, 4) + ' - ' + item.getField('title')});
        }
    }
    return [okCode, jsonMediaType, jsonStringify(responseData)];
};

function namesOrEtAl(names) {
    if (names.length > 0) {
        let nameString = names[0].lastName + ', ' + names[0].firstName;
        if (names.length == 2) {
            nameString += " & " + names[1].lastName + ', ' + names[1].firstName;
        } else if (names.length > 1) {
            nameString += ", et al.";
        }
        return nameString;
    }
}

function buildPathsResponse(items) {
    let regularItems = items.filter((item)=>{
        return item.isRegularItem();
    });
    let itemsWithPaths = regularItems.map((item)=>{
        let attachments = item.getAttachments(false).map((attachmentId)=>{
            return Zotero.Items.get(attachmentId);
        });
        return Zotero.Promise.filter(attachments, (attachment)=>{
            return attachment.isFileAttachment();
        }).then ((attachments)=>{
            return attachments.map((a)=> {
                return a.getFilePathAsync().then((path)=>{
                    if (path) {
                        return path;
                    } else {
                        return Zotero.Sync.Runner.downloadFile(a).then((_)=>{
                            return a.getFilePathAsync();
                        });
                    }
                });
            });
        }).then((paths)=>{
            return Promise.all(paths).then((paths)=>{
                return { 'key': ((item.libraryID || '0') + '_' + item.key), 'paths': paths };
            });
        });
    });
    return Promise.all(itemsWithPaths).then((responseData)=>{
        return [okCode, jsonMediaType, jsonStringify(responseData)];
    });
}

function handleErrors(f) {
    return (...args)=>{
        return f(...args).catch((ex)=>{
            if (ex instanceof ClientError) {
                return [badRequestCode, textMediaType, ex.message];
            } else {
                return [500, textMediaType, (ex && (ex.message + ex.stack))];
            }
        });
    };
}

function bibliographyEndpoint(options) {
    let cslEngine = makeCslEngine(options.data.styleId, Zotero);
    if (!cslEngine) {
        return makeClientError('No style found.');
    } else {
        //zotero.localItems = {};
        cslEngine.setOutputFormat('html');
        let groups = options.data.citationGroups.map(processCitationsGroup);
        return Promise.all(groups).then((citationGroups)=>{
            cslEngine.updateItems(extractIds(citationGroups));
            let retval = {};
            retval.bibliography = cslEngine.makeBibliography();
            retval.citationClusters = [];
            citationGroups.map (function (citationGroup) {
		        cslEngine.appendCitationCluster(citationGroup).map(function(updated) {
		            retval.citationClusters[updated[0]] = updated[1];
		        });
	        });
            return [okCode, jsonMediaType, jsonStringify(retval)];
        });
    }
}

function makeVersionEndpoint(data) {
    let dataCopy = Object.assign({}, data);
    return (options)=>{
        let retval = {"version": dataCopy.version};
        return [okCode, jsonMediaType, jsonStringify(retval)];
    }
}

function completeEndpoint(options) {
    if (!options.query.easykey) {
        return makeClientError('Option easykey is required.');
    } else {
        let q = cleanQuery(options.query);
        let search = buildEasyKeySearch(new Zotero.Search(), parseEasyKey(q.easykey, Zotero));
        return runSearch(search, Zotero).then((items)=>{
            if (!items) {
                return makeClientError('EasyKey must be of the form DoeTitle2000 or doe:2000title');
            } else {
                return buildResponse(items, 'easykey');
            }
        });
    }
}

function searchEndpoint(options) {
    const query = cleanQuery(options.query);
    if (query.q) {
        let search = buildSearch(new Zotero.Search(), query.q, query.method);
        if (!query.library) {
            search.libraryID = Zotero.Libraries.userLibraryID;
        } else if (query.library !== "all") {
            search.libraryID = query.library;
        }
        return runSearch(search, Zotero).then((items)=>{
            return buildResponse(items, query.format, query.style);
        });
    } else {
        return makeClientError('q param required.');
    }
}

function selectEndpoint(options) {
    let ZoteroPane = Components.classes['@mozilla.org/appshell/window-mediator;1'].
        getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow('navigator:browser').ZoteroPane;
    let q = cleanQuery(options.query);
    let promise = null;
    if (q.easykey) {
        promise = findByEasyKey(q.easykey, Zotero);
    } else if (q.key) {
        promise = findByKey(q.key, Zotero);
    } else if (q.betterbibtexkey) {
        promise = findByBBTKey(q.betterbibtexkey, Zotero);
    } else {
        return makeClientError('No param supplied!');
    }
    return promise.then(function(item) {
        if (item === false) {
            return makeClientError('item with key ' + q.key + ' not found!');
        }
        ZoteroPane.selectItem(item.id);
        return [okCode, jsonMediaType, jsonStringify('success')];
    });
}

function itemsEndpoint(options) {
    const q = cleanQuery(options.query);
    let items = [];
    let responder = (items) => { return buildResponse(items, q.format, q.style); };
    if (q.selected) {
        return responder(Zotero.getActiveZoteroPane().getSelectedItems());
    } else if (q.key) {
        let keys = q.key.split(',');
        return Promise.all(
            keys.map((key)=>{
                return findByKey(key, Zotero);
            })).then(responder);
    } else if (q.easykey) {
        let keys = q.easykey.split(',');
        return Promise.all(
            keys.map((key) => {
                return findByEasyKey(key, Zotero);
            })).then(responder);
    } else if (q.betterbibtexkey) {
        let keys = q.betterbibtexkey.split(',');
        return Promise.all(
            keys.map((key) => {
                return findByBBTKey(key, Zotero);
            })).then(responder);
    } else if (q.collection)
        return collectionSearch(q.collection).then(responder);
    else if (q.all) {
        return Zotero.Items.getAll(Zotero.Libraries.userLibraryID).then(responder);
    } else {
        return makeClientError('No param supplied!');
    }
}

/**
 * Function to load our endpoints into the Zotero connector server.
 */
function loadEndpoints (data) {
    loadZotero().then(function () {
        let endpoints = {
            'version': {
                supportedMethods: ['GET'],
                supportedDataType : ['application/x-www-form-urlencoded'],
                init : makeVersionEndpoint(data)
            },
            'complete' : {
                supportedMethods: ['GET'],
                supportedDataType : ['application/x-www-form-urlencoded'],
                init : handleErrors(completeEndpoint)
            },
            'bibliography' : {
                supportedMethods: ['POST'],
                supportedDataType: ['application/x-www-form-urlencoded'],
                init: handleErrors(bibliographyEndpoint)
            },
            'search' : {
                supportedMethods: ['GET'],
                supportedDataType : ['application/x-www-form-urlencoded'],
                init : handleErrors(searchEndpoint)
            },
            'select' : {
                supportedMethods:['GET'],
                supportedDataType : ['application/x-www-form-urlencoded'],
                init : handleErrors(selectEndpoint)
            },
            'items' : {
                supportedMethods:['GET'],
                supportedDataType : ['application/x-www-form-urlencoded'],
                init : handleErrors(itemsEndpoint)
            }

        };
        for (let e in endpoints) {
            let ep = Zotero.Server.Endpoints['/zotxt/' + e] = function() {};
            ep.prototype = endpoints[e];
        }
    });
}

function makeStartupObserver(addonData) {
    return {
        'observe': function(subject, topic, data) {
            loadZotero().then(function () {
                Components.utils.import('resource://gre/modules/FileUtils.jsm');
                Components.utils.import('resource://gre/modules/NetUtil.jsm');
                loadEndpoints(addonData);
            });
        }
    };
}

function startup(data, reason) {
    Components.utils.import('resource://gre/modules/Services.jsm');
    const observerService = Components.classes['@mozilla.org/observer-service;1'].
          getService(Components.interfaces.nsIObserverService);
    /* wait until after zotero is loaded */
    Components.utils.import('chrome://zotxt/content/modules/Core.jsm');
    observerService.addObserver(makeStartupObserver(data), 'final-ui-startup', false);
}

function shutdown (data, reason) {
}

function uninstall(data, reason) {
}

function install(data, reason) {
}
