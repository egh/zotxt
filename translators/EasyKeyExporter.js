{
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
}

function determineYear (item) {
    var year = "";
    var rawdate = item['date'];
    if (rawdate) {
        var yearMd = rawdate.match(/[0-9]{4}/);
        if (yearMd && yearMd[0]) { 
            year = yearMd[0];
        };
    }
    return year;
}

function determineAuthor (item) {
    var creator = item['creators'][0];
    var author = "Anonymous";
    if (creator && creator['lastName']) {
        author = creator['lastName'];
    }
    return ZU.capitalizeTitle(author);
}

function determineTitleWord(item) {
    var words = item['title'].split(/\s+/);
    var filteredWords = words.filter(function (word) {
        return (!word.match(/^([Tt]he|[Aa]n?)$/) &&
                !ZU.XRegExp.test(word, ZU.XRegExp('^[^\\w]+$')) &&
                !ZU.XRegExp.test(word, ZU.XRegExp('^[0-9]+$')));
    });
    if (filteredWords[0]) {
        return ZU.capitalizeTitle(ZU.XRegExp.replace(filteredWords[0], ZU.XRegExp('[^\\w]'), ''));
    } else {
        return "Unknown";
    }
}

function doExport () {
    var item;
    while((item = Zotero.nextItem())) {
        var year = determineYear(item);
        var author = determineAuthor(item);
        var titleword = determineTitleWord(item);
        Zotero.write("@" + author + titleword + year);
        Zotero.write("\n");
    }
}
