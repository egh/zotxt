/* global require describe it */

const assert = require('assert');
const sinon = require('sinon');
const xregexp = require('xregexp');

const core = require('../extension/content/modules/Core.jsm');

describe('#core.fixStyleId()', function() {
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


describe('#core.parseEasyKey()', function() {
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
