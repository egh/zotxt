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
    return ZU.XRegExp.split(author, ZU.XRegExp("\\s+|\\p{P}")).pop();
}

var stopwords = ["the", "an", "a", "at", "in", "on",
                 "el", "los", "la", "las",
                 "de",
                 "dem", "den", "der", "des", "die"];

function determineTitleWord(item) {
    var cleanTitle = item['title'].toLowerCase();
    var words = ZU.XRegExp.split(cleanTitle, ZU.XRegExp("\\s+|\\p{P}"));
    var filteredWords = words.filter(function (word) {
        return (stopwords.indexOf(word) == -1 &&
                word.length > 1 &&
                !ZU.XRegExp.test(word, ZU.XRegExp('^\\p{P}+$')) &&
                !ZU.XRegExp.test(word, ZU.XRegExp('^[0-9]+$')));
    });
    return filteredWords[0] || "unknown";
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
        if (Zotero.getOption("alternate")) {
            Zotero.write("@" + ZU.capitalizeTitle(author, true) + ZU.capitalizeTitle(titleword, true) + year);
        } else {
            Zotero.write("@" + author.toLowerCase() + ":" + year + titleword.toLowerCase());
        }            
    }
}
