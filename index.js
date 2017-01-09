/*! pandoc-filter-node | (C) 2014 Mike Henderson <mvhenderson@tds.net> | License: MIT */
/**
 * Javascript port of https://github.com/jgm/pandocfilters
 */
'use strict';

/**
 * Converts an action into a filter that reads a JSON-formatted pandoc
 * document from stdin, transforms it by walking the tree with the action, and
 * returns a new JSON-formatted pandoc document to stdout. The argument is a
 * function action(key, value, format, meta), where key is the type of the
 * pandoc object (e.g. 'Str', 'Para'), value is the contents of the object
 * (e.g. a string for 'Str', a list of inline elements for 'Para'), format is
 * the target output format (which will be taken for the first command
 * line argument if present), and meta is the document's metadata. If the
 * function returns None, the object to which it applies will remain
 * unchanged. If it returns an object, the object will be replaced. If it
 * returns a list, the list will be spliced in to the list to which the target
 * object belongs. (So, returning an empty list deletes the object.)
 *
 * @param  {Function} action Callback to apply to every object
 */
function toJSONFilter(action) {
	require('get-stdin')(function (json) {
    var data = JSON.parse(json);
    var format = (process.argv.length > 2 ? process.argv[2] : '');
    var output = filter(data, action, format);
    process.stdout.write(JSON.stringify(output));
	});
}

/**
 * Filter the given object
 */
function filter(data, action, format) {
  return walk(data, action, format, data[0].unMeta);
}

/**
 * Walk a tree, applying an action to every object.
 * @param  {Object}   x      The object to traverse
 * @param  {Function} action Callback to apply to each item
 * @param  {String}   format Output format
 * @param  {Object}   meta   Pandoc metadata
 * @return {Object}          The modified tree
 */
function walk(x, action, format, meta) {
  if (Array.isArray(x)) {
    var array = [];
    x.forEach(function (item) {
      if (item === Object(item) && item.t) {
        var res = action(item.t, item.c, format, meta);
        if (!res) {
          array.push(walk(item, action, format, meta));
        }
        else if (Array.isArray(res)) {
          res.forEach(function (z) {
            array.push(walk(z, action, format, meta));
          });
        }
        else {
          array.push(walk(res, action, format, meta));
        }
      }
      else {
        array.push(walk(item, action, format, meta));
      }
    });
    return array;
  }
  else if (x === Object(x)) {
    var obj = {};
    Object.keys(x).forEach(function (k) {
      obj[k] = walk(x[k], action, format, meta);
    });
    return obj;
  }
  return x;
}

/**
 * Walks the tree x and returns concatenated string content, leaving out all
 * formatting.
 * @param  {Object} x The object to walk
 * @return {String}   JSON string
 */
function stringify(x) {
	if (x === Object(x) && x.t === 'MetaString') return x.c;

  var result = [];
  var go = function (key, val) {
    if (key === 'Str') result.push(val);
    else if (key === 'Code') result.push(val[1]);
    else if (key === 'Math') result.push(val[1]);
    else if (key === 'LineBreak') result.push(' ');
    else if (key === 'Space') result.push(' ');
  };
  walk(x, go, '', {});
  return result.join('');
}

/**
 * Returns an attribute list, constructed from the dictionary attrs.
 * @param  {Object} attrs Attribute dictionary
 * @return {Array}        Attribute list
 */
function attributes(attrs) {
  attrs = attrs || {};
  var ident = attrs.id || '';
  var classes = attrs.classes || [];
  var keyvals = [];
  Object.keys(attrs).forEach(function (k) {
    if (k !== 'classes' && k !== 'id') keyvals.push([k,attrs[k]]);
  });
  return [ident, classes, keyvals];
}

// Utility for creating constructor functions
function elt(eltType, numargs) {
	return function () {
		var args = Array.prototype.slice.call(arguments);
		var len = args.length;
		if (len !== numargs)
			throw eltType + ' expects ' + numargs	+ ' arguments, but given ' + len;
		return {'t':eltType,'c':(len === 1 ? args[0] : args)};
	};
}

module.exports = {
	// filter functions
  toJSONFilter: toJSONFilter,
  walk: walk,
  stringify: stringify,
  attributes: attributes,

	// Constructors for block elements

	Plain: elt('Plain',1),
	Para: elt('Para',1),
	CodeBlock: elt('CodeBlock',2),
	RawBlock: elt('RawBlock',2),
	BlockQuote: elt('BlockQuote',1),
	OrderedList: elt('OrderedList',2),
	BulletList: elt('BulletList',1),
	DefinitionList: elt('DefinitionList',1),
	Header: elt('Header',3),
	HorizontalRule: elt('HorizontalRule',0),
	Table: elt('Table',5),
	Div: elt('Div',2),
	Null: elt('Null',0),

	// Constructors for inline elements

	Str: elt('Str',1),
	Emph: elt('Emph',1),
	Strong: elt('Strong',1),
	Strikeout: elt('Strikeout',1),
	Superscript: elt('Superscript',1),
	Subscript: elt('Subscript',1),
	SmallCaps: elt('SmallCaps',1),
	Quoted: elt('Quoted',2),
	Cite: elt('Cite',2),
	Code: elt('Code',2),
	Space: elt('Space',0),
	LineBreak: elt('LineBreak',0),
	Formula: elt('Math',2), // don't conflict with js builtin Math
	RawInline: elt('RawInline',2),
	Link: elt('Link',2),
	Image: elt('Image',2),
	Note: elt('Note',1),
	Span: elt('Span',2),

  // a few aliases
  stdio: toJSONFilter,
  filter: filter,

};



