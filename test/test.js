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
        assert.deepEqual(altRes, core.parseEasyKey('foo:2016bar', xregexp));
    });

    it('should parse a normal easykey', ()=>{
        assert.deepEqual(res, core.parseEasyKey('FooBar2016', xregexp));
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
    const mkPromises = (...rest)=>{ return rest.map(bluebird.resolve); };
    it('should return an Promise that resolves to an iterable', ()=>{
        return core.dedupItems(mkPromises(item1), bluebird.filter).then((items)=>{
            assert.equal(1, items.length);
            assert.deepEqual(item1, items[0]);
        });
    });

    it('should dedup with the same id', ()=>{
        return core.dedupItems(mkPromises(item1, item1), bluebird.filter).then((items)=>{
            assert.equal(1, items.length);
            assert.deepEqual(item1, items[0]);
        });
    });

    it('should dedup and return in order', ()=>{
        return core.dedupItems(mkPromises(item1, item2, item1, item3, item1), bluebird.filter).then((items)=>{
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
