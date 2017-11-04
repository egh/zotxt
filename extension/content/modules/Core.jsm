var EXPORTED_SYMBOLS = [ 'fixStyleId' ];

function fixStyleId(styleId) {
    if (!styleId) {
        return  'http://www.zotero.org/styles/chicago-note-bibliography';
    } else if (!styleId.match(/^http:/)) {
        return 'http://www.zotero.org/styles/' + styleId;
    } else {
        return styleId;
    }
}


if (process) {
    module.exports.fixStyleId = fixStyleId;
}
