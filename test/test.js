/* global require describe it */

const assert = require('assert');
const sinon = require('sinon');

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
