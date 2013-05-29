cite = textualCite / normalCite

// characters

sp = " " / "\u0160"

notspace = [^ \u0160]

ts = " " / "\t"

nl = "\n" / "\u2019"

spnl = sp* nl? sp*

// equivalent to notFollowedBy space << rawToken
// wordFollowedBySpace = first:(. !sp)* last:.
// { var first1 = first.map(function (x) { return x[0]; }).join("");
//   return first1 + last;
// }

word = word:([^ \u0160\];])+
{ 
  return word.join("");
}

wordWithDigits = word:word &{ return word.match(/[0-9]/); }
{
  return word;
}

citeKey = minus:("-"?) "@" first:[a-z]i rest:[a-z0-9:.#$%&_+?<>~/-]i*
{
  return (minus + "@" + first + rest.join(""));
}

prefix = first:(. !citeKey)* last:.
{ 
  return first.map(function (x) { return x[0]; }).join("") + last;
}

locator = ","? sp first:word sp+ rest:wordWithDigits { return { "locator" : first + " " + rest}; }

suffix = suffix:[^\];]+
{
  return { "suffix": suffix.join("") };
}

locatorSuffix = locator !suffix / !locator suffix / (locator suffix)

citation = prefix:prefix? citeKey:citeKey locatorSuffix:locatorSuffix?
{
  return { "prefix":prefix, "citeKey": citeKey , "locatorSuffix": locatorSuffix};
}

citeList = citation (";" citation)*

normalCite = "[" spnl citeList spnl "]"

bareloc = spnl "[" locatorSuffix (";" citeList )? spnl "]"

textualCite = citeKey spnl bareloc?
