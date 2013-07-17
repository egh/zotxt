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
    return author;
}

var stopwords = ["the", "an",
                 "de",
                 "dem", "den", "der", "des", "die"];
                 
function determineTitleWord(item) {
    var cleanTitle = ZU.XRegExp.replace(item['title'].toLowerCase(), ZU.XRegExp('\\p{P}'), '');
    var words = ZU.XRegExp.split(cleanTitle, ZU.XRegExp("\\s+"));
    var filteredWords = words.filter(function (word) {
        return (stopwords.indexOf(word) == -1 &&
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
