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
    return ZU.capitalizeTitle(author, true);
}

var stopwords = ["the", "an",
                 "de",
                 "dem", "den", "der", "des", "die"];
                 
function determineTitleWord(item) {
    var words = item['title'].split(/\s+/);
    var filteredWords = words.filter(function (word) {
        return (stopwords.indexOf(word.toLowerCase()) == -1 &&
                !ZU.XRegExp.test(word, ZU.XRegExp('^[^\\w]+$')) &&
                !ZU.XRegExp.test(word, ZU.XRegExp('^[0-9]+$')));
    });
    if (filteredWords[0]) {
        return ZU.capitalizeTitle(ZU.XRegExp.replace(filteredWords[0], ZU.XRegExp('[^\\w]'), ''), true);
    } else {
        return "Unknown";
    }
}

function doExport () {
    var item;
    var first = true;
    while((item = Zotero.nextItem())) {
        // only write spaces after the first export
        if (!first) {
            Zotero.write(" ");
        } else {
            first = false;
        }
        var year = determineYear(item);
        var author = determineAuthor(item);
        var titleword = determineTitleWord(item);
        Zotero.write("@" + author + titleword + year);
    }
}
