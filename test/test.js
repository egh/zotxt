/* global require describe it */

const assert = require('assert');
const sinon = require('sinon');
const xregexp = require('xregexp');
const bluebird = require('bluebird');

const core = require('../extension/content/modules/Core.jsm');

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
    let getByLibraryAndKeyAsync = sinon.spy();
    let parseLibraryKey = sinon.stub().returns({ libraryID: 2, key: 'bar' });
    let zotero = { Items : { getByLibraryAndKeyAsync, parseLibraryKey } };

    it("calls getByLibraryAndKeyAsync when a key without a / is passed in", ()=>{
        getByLibraryAndKeyAsync.reset();
        const key = 'foo_bar';
        core.findByKey(key, zotero);
        assert(parseLibraryKey.notCalled);
        assert(getByLibraryAndKeyAsync.calledOnce);
        assert(getByLibraryAndKeyAsync.calledWith(1, key));
    });

    it("fetches the library id and calls getByLibraryAndKeyAsync when a key with a / is used", ()=>{
        getByLibraryAndKeyAsync.reset();
        const key = 'foo/bar';
        core.findByKey(key, zotero);
        assert(parseLibraryKey.calledOnce);
        assert(parseLibraryKey.calledWith(key));
        assert(getByLibraryAndKeyAsync.calledOnce);
        assert(getByLibraryAndKeyAsync.calledWith(2, 'bar'));
    });
});


describe('#core.makeCslEngine()', () => {
    let opt, getCiteProc, style, get, zotero, styleName;

    beforeEach(()=>{
        opt = { development_extensions: { wrap_url_and_doi: false } };
        getCiteProc = sinon.stub().returns({ opt });;
        style = { getCiteProc };
        get = sinon.stub().returns(style);
        zotero = { Styles : { get } };
        styleName = 'foo';
    });

    it("sets wrap_url_and_dio", ()=>{
        core.makeCslEngine(styleName, zotero);
        assert.equal(true, opt.development_extensions.wrap_url_and_doi);
    });

    it("sets calls Styles.get", ()=>{
        core.makeCslEngine(styleName, zotero);
        sinon.assert.calledOnce(get);
        sinon.assert.calledWith(get, `http://www.zotero.org/styles/${styleName}`);
    });

    it("sets calls getCiteProc", ()=>{
        core.makeCslEngine(styleName, zotero);
        sinon.assert.calledOnce(getCiteProc);
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
        const getByLibraryAndKeyAsync = sinon.stub().returns(retval);
        const Items = { getByLibraryAndKeyAsync };
        const zotero = { Items };
        assert.equal(retval, core.getItemOrParent(item, zotero));
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
