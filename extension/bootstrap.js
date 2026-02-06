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

/* global Components, Set, FileUtils, NetUtil, Q, runSearch, findByKey, cleanQuery, buildSearch, makeCslEngine, findByCitationKey, jsonStringify, item2key, ClientError, ensureLoaded, checkBBT */
"use strict";

var uuidRe = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}/;

const jsonMediaType = "application/json; charset=UTF-8";
const textMediaType = "text/plain; charset=UTF-8";
const badRequestCode = 400;
const okCode = 200;

function collectionSearch(name) {
    let collections = Zotero.Collections.getByLibrary(
        Zotero.Libraries.userLibraryID,
        true,
    );
    for (let collection of collections) {
        if (collection.name === name) {
            return collection.getChildItems();
        }
    }
    throw new ClientError(`collection ${name} not found`);
}

async function processCitationItem(citation) {
    let cloneButSetId = (item) => {
        let retval = Object.assign({}, citation);
        retval.id = item.id;
        delete retval.easyKey;
        delete retval.key;
        return retval;
    };
    if ("easyKey" in citation) {
        const item = await findByEasyKey(citation.easyKey, Zotero);
        return cloneButSetId(item);
    } else if ("key" in citation) {
        const item = await findByKey(citation.key, Zotero);
        return cloneButSetId(item);
    } else {
        return citation;
    }
}

/**
 * Map the easykeys in the citations to ids.
 */
async function processCitationsGroup(citationGroup) {
    let citationItems = citationGroup.citationItems.map(processCitationItem);
    const items = await Promise.all(citationItems);
    return {
        properties: citationGroup.properties,
        citationItems: items,
    };
}

/**
 * Extract the ids from an array of citationGroups.
 */
function extractIds(citationGroups) {
    let ids = [];
    citationGroups.map(function (group) {
        group.citationItems.map(function (citationItem) {
            ids.push(citationItem.id);
        });
    });
    return ids;
}

function myExport(items, translatorId) {
    return new Promise((resolve, reject) => {
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
        if (translatorId === "a515a220-6fef-45ea-9842-8025dfebcc8f") {
            translation.setDisplayOptions({ quickCopyMode: "citekeys" });
        }
        translation.translate();
    });
}

/**
 * Build a response based on items and a format parameter.
 */
async function buildResponse(items, format, style, locale) {
    items = await ensureLoaded(items, Zotero);
    if (format === "key") {
        return [okCode, "application/json", jsonStringify(items.map(item2key))];
    } else if (format === "betterbibtexkey" || format === "citekey") {
        return buildBBTKeyResponse(items);
    } else if (format === "bibtex") {
        return buildBibTeXResponse(items);
    } else if (format === "bibliography") {
        return buildBibliographyResponse(items, style, locale);
    } else if (format === "quickBib") {
        return buildQuickBibResponse(items);
    } else if (format === "paths") {
        return buildPathsResponse(items, style);
    } else if (format && format.match(uuidRe)) {
        return buildExportResponse(items, format);
    } else {
        return buildJsonResponse(items);
    }
}

function buildJsonResponse(items) {
    /* Use BetterBibTeX JSON if available */
    if (Zotero.BetterBibTeX) {
        return buildExportResponse(
            items,
            "f4b52ab0-f878-4556-85a0-c7aeedd09dfc",
        );
    } else {
        return buildExportResponse(
            items,
            "bc03b4fe-436d-4a1f-ba59-de4d2d7a63f7",
        );
    }
}

/**
 * Build a response of a set of citation keys based on a set of items and a
 * translatorId via the Zotero export process.
 */
async function buildKeyResponse(items, translatorId) {
    if (items.length === 0) {
        return [okCode, "application/json", jsonStringify([])];
    }
    const rawKeys = await myExport(items, translatorId);
    let keys = rawKeys.split(/[ ,]/);
    // remove leading @
    let keys2 = keys.map(function (key) {
        return key.replace(/[\[\]@]/g, "");
    });
    return [okCode, jsonMediaType, jsonStringify(keys2)];
}

function buildBBTKeyResponse(items) {
    checkBBT();
    return buildKeyResponse(items, "a515a220-6fef-45ea-9842-8025dfebcc8f");
}

async function buildExportResponse(items, translatorId) {
    const data = await myExport(items, translatorId);
    return [okCode, textMediaType, data];
}

function buildBibTeXResponse(items) {
    return buildExportResponse(items, "9cb70025-a888-4a29-a210-93ec52da40d4");
}

function buildBibliographyResponse(items, style, locale) {
    let htmlCsl = makeCslEngine(style, locale, Zotero, "html");
    let textCsl = makeCslEngine(style, locale, Zotero, "text");
    let responseData = items.map((item) => {
        htmlCsl.updateItems([item.id], true);
        textCsl.updateItems([item.id], true);
        return {
            key: (item.libraryID || "0") + "_" + item.key,
            html: Zotero.Cite.makeFormattedBibliography(htmlCsl, "html"),
            // strip newlines
            text: Zotero.Cite.makeFormattedBibliography(
                textCsl,
                "text",
            ).replace(/(\r\n|\n|\r)/gm, ""),
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
            for (let i = 0; i < creators.length; i++) {
                if (creators[i].creatorTypeID == 1) {
                    authors.push(creators[i]);
                }
            }
            // only authors if there are any
            let creatorString =
                namesOrEtAl(authors) || namesOrEtAl(creators) || "N.A.";
            responseData.push({
                key: (item.libraryID || "0") + "_" + item.key,
                quickBib:
                    creatorString +
                    " - " +
                    item.getField("date", true).substr(0, 4) +
                    " - " +
                    item.getField("title"),
            });
        }
    }
    return [okCode, jsonMediaType, jsonStringify(responseData)];
}

function namesOrEtAl(names) {
    if (names.length > 0) {
        let nameString = names[0].lastName + ", " + names[0].firstName;
        if (names.length == 2) {
            nameString += " & " + names[1].lastName + ", " + names[1].firstName;
        } else if (names.length > 1) {
            nameString += ", et al.";
        }
        return nameString;
    }
}

async function buildPathsResponse(items) {
    let regularItems = items.filter((item) => {
        return item.isRegularItem();
    });
    let itemsWithPaths = regularItems.map(async (item) => {
        let attachments = item.getAttachments(false).map((attachmentId) => {
            return Zotero.Items.get(attachmentId);
        });

        // Filter attachments to only file attachments
        let fileAttachments = [];
        for (let i = 0; i < attachments.length; i++) {
            let attachment = attachments[i];
            if (attachment.isFileAttachment()) {
                fileAttachments.push(attachment);
            }
        }

        let paths = await Promise.all(
            fileAttachments.map(async (a) => {
                const path = await a.getFilePathAsync();
                if (path) {
                    return path;
                } else {
                    await Zotero.Sync.Runner.downloadFile(a);
                    return a.getFilePathAsync();
                }
            }),
        );

        return {
            key: (item.libraryID || "0") + "_" + item.key,
            paths: paths,
        };
    });

    const responseData = await Promise.all(itemsWithPaths);
    return [okCode, jsonMediaType, jsonStringify(responseData)];
}

/**
 * Handle errors from endpoint methods and return appropriate HTTP response.
 */
function handleEndpointError(ex) {
    if (ex instanceof ClientError) {
        return [badRequestCode, jsonMediaType, `"${ex.message}"`];
    } else {
        return [500, textMediaType, ex && ex.message + ex.stack];
    }
}

class VersionEndpoint {
    supportedMethods = ["GET"];
    supportedDataTypes = ["application/x-www-form-urlencoded"];

    init(request) {
        try {
            return [
                okCode,
                jsonMediaType,
                jsonStringify({ version: VersionEndpoint.version }),
            ];
        } catch (ex) {
            return handleEndpointError(ex);
        }
    }
}

class CompleteEndpoint {
    supportedMethods = ["GET"];
    supportedDataTypes = ["application/x-www-form-urlencoded"];

    async init(request) {
        try {
            const prefix = request.searchParams.get("prefix");
            if (!prefix) {
                throw new ClientError("Option prefix is required.");
            }

            const items = await searchByCitationKeyPrefix(prefix, Zotero);
            return [
                okCode,
                jsonMediaType,
                jsonStringify(
                    items.map((item) => item.getField("citationKey")),
                ),
            ];
        } catch (ex) {
            return handleEndpointError(ex);
        }
    }
}

class BibliographyEndpoint {
    supportedMethods = ["POST"];
    supportedDataTypes = [
        "application/x-www-form-urlencoded",
        "application/json",
    ];

    async init(request) {
        try {
            let cslEngine = makeCslEngine(
                request.data.styleId,
                request.data.locale,
                Zotero,
                "html",
            );
            if (!cslEngine) {
                throw new ClientError("No style found.");
            }

            cslEngine.setOutputFormat("html");
            let groups = request.data.citationGroups.map(processCitationsGroup);
            const citationGroups = await Promise.all(groups);

            cslEngine.updateItems(extractIds(citationGroups));
            let retval = {};
            retval.bibliography = cslEngine.makeBibliography();
            retval.citationClusters = [];
            citationGroups.map(function (citationGroup) {
                cslEngine
                    .appendCitationCluster(citationGroup)
                    .map(function (updated) {
                        retval.citationClusters[updated[0]] = updated[1];
                    });
            });
            return [okCode, jsonMediaType, jsonStringify(retval)];
        } catch (ex) {
            return handleEndpointError(ex);
        }
    }
}

class SearchEndpoint {
    supportedMethods = ["GET"];
    supportedDataTypes = ["application/x-www-form-urlencoded"];

    async init(request) {
        try {
            const q = request.searchParams.get("q");
            const library = request.searchParams.get("library");
            const method = request.searchParams.get("method");
            const format = request.searchParams.get("format");
            const style = request.searchParams.get("style");
            const locale = request.searchParams.get("locale");
            if (!q) {
                throw new ClientError("q param required.");
            }

            let search = buildSearch(new Zotero.Search(), q, method);
            if (!library) {
                search.libraryID = Zotero.Libraries.userLibraryID;
            } else if (library !== "all") {
                search.libraryID = library;
            }
            const items = await runSearch(search, Zotero);
            return buildResponse(items, format, style, locale);
        } catch (ex) {
            return handleEndpointError(ex);
        }
    }
}

class SelectEndpoint {
    supportedMethods = ["GET"];
    supportedDataTypes = ["application/x-www-form-urlencoded"];

    async init(request) {
        try {
            let ZoteroPane = Components.classes[
                "@mozilla.org/appshell/window-mediator;1"
            ]
                .getService(Components.interfaces.nsIWindowMediator)
                .getMostRecentWindow("navigator:browser").ZoteroPane;
            const key = request.searchParams.get("key");
            const betterbibtexkey = request.searchParams.get("betterbibtexkey");
            const citekey = request.searchParams.get("citekey");

            let item;
            if (key) {
                item = await findByKey(key, Zotero);
            } else if (betterbibtexkey || citekey) {
                item = await findByCitationKey(
                    betterbibtexkey || citekey,
                    Zotero,
                );
            } else {
                throw new ClientError("No param supplied!");
            }

            if (item === false) {
                throw new ClientError("item with key " + key + " not found!");
            }
            ZoteroPane.selectItem(item.id);
            return [okCode, jsonMediaType, jsonStringify("success")];
        } catch (ex) {
            return handleEndpointError(ex);
        }
    }
}

class ItemsEndpoint {
    supportedMethods = ["GET"];
    supportedDataTypes = ["application/x-www-form-urlencoded"];

    async init(request) {
        try {
            const selected = request.searchParams.get("selected");
            const key = request.searchParams.get("key");
            const betterbibtexkey = request.searchParams.get("betterbibtexkey");
            const citekey = request.searchParams.get("citekey");
            const collection = request.searchParams.get("collection");
            const all = request.searchParams.get("all");
            const format = request.searchParams.get("format");
            const style = request.searchParams.get("style");
            const locale = request.searchParams.get("locale");

            let items;
            if (selected) {
                items = Zotero.getActiveZoteroPane().getSelectedItems();
            } else if (key) {
                let keys = key.split(",");
                items = await Promise.all(
                    keys.map((key) => {
                        return findByKey(key, Zotero);
                    }),
                );
            } else if (betterbibtexkey || citekey) {
                let keys = betterbibtexkey
                    ? betterbibtexkey.split(",")
                    : citekey.split(",");
                items = await Promise.all(
                    keys.map((key) => {
                        return findByCitationKey(key, Zotero);
                    }),
                );
            } else if (collection) {
                items = await collectionSearch(collection);
            } else if (all) {
                items = await Zotero.Items.getAll(
                    Zotero.Libraries.userLibraryID,
                );
            } else {
                throw new ClientError("No param supplied!");
            }

            return buildResponse(items, format, style, locale);
        } catch (ex) {
            return handleEndpointError(ex);
        }
    }
}

class StylesEndpoint {
    supportedMethods = ["GET"];
    supportedDataTypes = ["application/x-www-form-urlencoded"];

    init(request) {
        return [
            okCode,
            jsonMediaType,
            jsonStringify(Zotero.Styles.getVisible()),
        ];
    }
}

class LocalesEndpoint {
    supportedMethods = ["GET"];
    supportedDataTypes = ["application/x-www-form-urlencoded"];

    init(request) {
        return [
            okCode,
            jsonMediaType,
            jsonStringify(Zotero.Locale.availableLocales),
        ];
    }
}

/**
 * Function to load our endpoints into the Zotero connector server.
 */
function loadEndpoints(version) {
    // Register all endpoints
    VersionEndpoint.version = version;
    Zotero.Server.Endpoints["/zotxt/version"] = VersionEndpoint;
    Zotero.Server.Endpoints["/zotxt/complete"] = CompleteEndpoint;
    Zotero.Server.Endpoints["/zotxt/bibliography"] = BibliographyEndpoint;
    Zotero.Server.Endpoints["/zotxt/search"] = SearchEndpoint;
    Zotero.Server.Endpoints["/zotxt/select"] = SelectEndpoint;
    Zotero.Server.Endpoints["/zotxt/items"] = ItemsEndpoint;
    Zotero.Server.Endpoints["/zotxt/styles"] = StylesEndpoint;
    Zotero.Server.Endpoints["/zotxt/locales"] = LocalesEndpoint;
}

function startup({ id, version, resourceURI, rootURI = resourceURI.spec }) {
    Zotero.debug(rootURI + "core.js");
    Services.scriptloader.loadSubScript(rootURI + "core.js");
    loadEndpoints(version);
}

function shutdown() {
    // Clean up all registered endpoints
    for (const endpoint of Object.keys(Zotero.Server.Endpoints)) {
        if (endpoint.startsWith("/zotxt/")) {
            delete Zotero.Server.Endpoints[endpoint];
        }
    }
}

function uninstall() {}

function install() {}
