/* global require describe it */

const assert = require('assert');
const sinon = require('sinon');
const xregexp = require('xregexp');
const bluebird = require('bluebird');

const core = require('../extension/core.js');

describe('#core.fixStyleId()', () => {
    it('should return chicago as default', ()=>{
        assert.equal('http://www.zotero.org/styles/chicago-note-bibliography', core.fixStyleId());
    });

    it('should append the prefix if necessary', ()=>{
        assert.equal('http://www.zotero.org/styles/foobar', core.fixStyleId('foobar'));
    });

    it('should return the full url otherwise', ()=>{
        const url = 'http://example.org/foo';
        assert.equal(url, core.fixStyleId(url));
    });
});


describe('#core.checkStyleId()', () => {
    const styleId = "http://example.org/chicago"
    beforeEach(()=>{
        getAll = sinon.stub().returns({[styleId]: {"styleID": styleId}});
        zotero = { Styles : { getAll } };
    });

    it('should do nothing for good styles', ()=>{
        assert.equal(styleId, core.checkStyleId(styleId, zotero));
    });

    it('should throw an exception for a bad style', ()=>{
        assert.throws(
            ()=> {
                core.checkStyleId('http://example.org/bad', zotero);
            },
            /Style .*bad is not installed/);
    });
});


describe('#core.parseEasyKey()', () => {
    const zotero = { Utilities: { XRegExp: xregexp } };
    const altRes = {
        creator: 'foo',
        date: '2016',
        title: 'bar'
    };

    const res = {
        creator: 'Foo',
        date: '2016',
        title: 'Bar'
    };

    it('should parse an alternative easykey', ()=>{
        assert.deepEqual(altRes, core.parseEasyKey('foo:2016bar', zotero));
    });

    it('should parse a normal easykey', ()=>{
        assert.deepEqual(res, core.parseEasyKey('FooBar2016', zotero));
    });
});

describe('#core.cleanQuery()', () => {
    it('should replace all + with space', ()=>{
        assert.deepEqual({foo: 'foo bar'}, core.cleanQuery({foo: 'foo+bar'}));
    });
});

describe('#core.dedupItems()', () => {
    const item1 = {id: 1};
    const item2 = {id: 2};
    const item3 = {id: 3};
    const zotero = { Promise: { filter: bluebird.filter } };
    const mkPromises = (...rest)=>{ return rest.map(bluebird.resolve); };
    it('should return an Promise that resolves to an iterable', ()=>{
        return core.dedupItems(mkPromises(item1), zotero).then((items)=>{
            assert.equal(1, items.length);
            assert.deepEqual(item1, items[0]);
        });
    });

    it('should dedup with the same id', ()=>{
        return core.dedupItems(mkPromises(item1, item1), zotero).then((items)=>{
            assert.equal(1, items.length);
            assert.deepEqual(item1, items[0]);
        });
    });

    it('should dedup and return in order', ()=>{
        return core.dedupItems(mkPromises(item1, item2, item1, item3, item1), zotero).then((items)=>{
            assert.equal(3, items.length);
            assert.deepEqual(item1, items[0]);
            assert.deepEqual(item2, items[1]);
            assert.deepEqual(item3, items[2]);
        });
    });
});

describe('#core.item2key()', () => {
    it('builds a key', ()=>{
        const item = { libraryID: '2', key: 'foo' };
        assert('2_foo', core.item2key(item));
    });

    it('defaults to librar 1', ()=>{
        const item = { key: 'foo' };
        assert('1_foo', core.item2key(item));
    });
});

describe('#core.findByKey()', () => {
    let getByLibraryAndKeyAsync, parseLibraryKey, zotero;

    beforeEach(()=>{
        getByLibraryAndKeyAsync = sinon.stub().returns(Promise.resolve(true));
        parseLibraryKey = sinon.stub().returns({ libraryID: 2, key: 'bar' });
        zotero =  { Items : { getByLibraryAndKeyAsync, parseLibraryKey } };
    });

    it("calls getByLibraryAndKeyAsync when a key without a / is passed in", ()=>{
        const key = 'foo-bar';
        core.findByKey(key, zotero);
        assert(parseLibraryKey.notCalled);
        assert(getByLibraryAndKeyAsync.calledOnce);
        assert(getByLibraryAndKeyAsync.calledWith(1, key));
    });

    it("calls getByLibraryAndKeyAsync when a key with a _ is passed in", ()=>{
        const key = '3_bar';
        core.findByKey(key, zotero);
        assert(parseLibraryKey.notCalled);
        assert(getByLibraryAndKeyAsync.calledOnce);
        assert(getByLibraryAndKeyAsync.calledWith(3, 'bar'));
    });

    it("fetches the library id and calls getByLibraryAndKeyAsync when a key with a / is used", ()=>{
        const key = 'foo/bar';
        core.findByKey(key, zotero);
        assert(parseLibraryKey.calledOnce);
        assert(parseLibraryKey.calledWith(key));
        assert(getByLibraryAndKeyAsync.calledOnce);
        assert(getByLibraryAndKeyAsync.calledWith(2, 'bar'));
    });
});


describe('#core.makeCslEngine()', () => {
    let opt, getCiteProc, style, get, zotero, styleName, locale, styleId, getAll;

    beforeEach(()=>{
        opt = { development_extensions: { wrap_url_and_doi: false } };
        getCiteProc = sinon.stub().returns({ opt });
        style = { getCiteProc };
        styleName = 'foo';
        locale = 'en-US';
        styleId = `http://www.zotero.org/styles/${styleName}`;
        get = sinon.stub().returns(style);
        getAll = sinon.stub().returns({[styleId]: {"styleID": styleId}});
        zotero = { Styles : { get, getAll } };
    });

    it("sets wrap_url_and_dio", ()=>{
        core.makeCslEngine(styleName, locale, zotero, 'html');
        assert.equal(true, opt.development_extensions.wrap_url_and_doi);
    });

    it("sets calls Styles.get", ()=>{
        core.makeCslEngine(styleName, locale, zotero, 'text');
        sinon.assert.calledOnce(get);
        sinon.assert.calledWith(get, styleId);
    });

    it("sets calls getCiteProc with locale", ()=>{
        core.makeCslEngine(styleName, locale, zotero, 'html');
        sinon.assert.calledOnce(getCiteProc);
        sinon.assert.calledWith(getCiteProc, 'en-US', 'html');
    });
});

describe('#core.getItemOrParent()', () => {
    it("returns item when item is a regularItem", ()=>{
        const isRegularItem = sinon.stub().returns(true);
        const item = { isRegularItem };
        assert.equal(item, core.getItemOrParent(item, undefined));
    });

    it("returns item when item is not a regularItem but the parentKey is falsey", ()=>{
        const isRegularItem = sinon.stub().returns(false);
        const parentKey = undefined;
        const item = { isRegularItem, parentKey };
        assert.equal(item, core.getItemOrParent(item, undefined));
    });

    it("returns item when item is not a regularItem but the parentKey is falsey", ()=>{
        const retval = 'foo';
        const isRegularItem = sinon.stub().returns(false);
        const parentKey = "foo_bar";
        const item = { isRegularItem, parentKey };
        const getByLibraryAndKeyAsync = sinon.stub().returns(Promise.resolve(retval));
        const Items = { getByLibraryAndKeyAsync };
        const zotero = { Items };
        core.getItemOrParent(item, zotero).then((item)=> { assert.equal(retval, item); });
    });
});

describe('#core.buildSearch()', () => {
    let addCondition, search;

    beforeEach(()=>{
        addCondition = sinon.stub();
        search = { addCondition };
    });

    it("sets joinMode to all ", ()=>{
        core.buildSearch(search, 'foo', null);
        sinon.assert.calledWith(addCondition, 'joinMode', 'all');
    });

    it("searches titleCreatorYear by default", ()=>{
        core.buildSearch(search, 'foo', null);
        sinon.assert.calledWith(addCondition, 'quicksearch-titleCreatorYear', 'contains', 'foo');
    });

    it("uses the method if passed in by default", ()=>{
        core.buildSearch(search, 'foo', 'test');
        sinon.assert.calledWith(addCondition, 'quicksearch-test', 'contains', 'foo');
    });

    it("splits words for search", ()=>{
        core.buildSearch(search, 'foo bar', null);
        sinon.assert.calledWith(addCondition, 'quicksearch-titleCreatorYear', 'contains', 'foo');
        sinon.assert.calledWith(addCondition, 'quicksearch-titleCreatorYear', 'contains', 'bar');
    });
});

describe('#core.buildRawSearch()', () => {
    let addCondition, search;

    beforeEach(()=>{
        addCondition = sinon.stub();
        search = { addCondition };
    });

    it("sets up the search as expected ", ()=>{
        core.buildRawSearch(search, 'foo:2016bar');
        sinon.assert.calledWith(addCondition, 'joinMode', 'any');
        sinon.assert.calledWith(addCondition, 'tag', 'is', '@foo:2016bar');
        sinon.assert.calledWith(addCondition, 'note', 'contains', '@foo:2016bar');
    });
});


describe('#core.buildEasyKeySearch()', () => {
    let addCondition, search;
    const zotero = { Utilities: { XRegExp: xregexp } };

    beforeEach(()=>{
        addCondition = sinon.stub();
        search = { addCondition };
    });

    it("adds all fields if provided", ()=>{
        const key = core.parseEasyKey('foo:2016bar', zotero);
        core.buildEasyKeySearch(search, key);
        sinon.assert.calledWith(addCondition, 'creator', 'contains', 'foo');
        sinon.assert.calledWith(addCondition, 'title', 'contains', 'bar');
        sinon.assert.calledWith(addCondition, 'date', 'is', '2016');
    });

    it("splits names", ()=>{
        const key = core.parseEasyKey('foo_bar:2016baz', zotero);
        core.buildEasyKeySearch(search, key);
        sinon.assert.calledWith(addCondition, 'creator', 'contains', 'foo');
        sinon.assert.calledWith(addCondition, 'creator', 'contains', 'bar');
    });

    it("works when date not provided", ()=>{
        const key = core.parseEasyKey('foo:bar', zotero);
        core.buildEasyKeySearch(search, key);
        sinon.assert.calledWith(addCondition, 'creator', 'contains', 'foo');
        sinon.assert.calledWith(addCondition, 'title', 'contains', 'bar');
        sinon.assert.calledTwice(addCondition);
    });

    it("works when title not provided", ()=>{
        const key = core.parseEasyKey('foo:2016', zotero);
        core.buildEasyKeySearch(search, key);
        sinon.assert.calledWith(addCondition, 'creator', 'contains', 'foo');
        sinon.assert.calledWith(addCondition, 'date', 'is', '2016');
        sinon.assert.calledTwice(addCondition);
    });

    it("works when date title not provided", ()=>{
        const key = core.parseEasyKey('foo:', zotero);
        core.buildEasyKeySearch(search, key);
        sinon.assert.calledWith(addCondition, 'creator', 'contains', 'foo');
        sinon.assert.calledOnce(addCondition);
    });
});
