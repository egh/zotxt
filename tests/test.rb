# -*- coding: utf-8 -*-
require 'minitest/autorun'
require 'httpclient'
require 'json'

class ZotxtTest < MiniTest::Unit::TestCase
  def setup
    @client = HTTPClient.new
    @base_url = "http://localhost:23119/zotxt"
    @item_url = "#{@base_url}/items"
    @complete_url = "#{@base_url}/complete"
    @bibliography_url = "#{@base_url}/bibliography"
  end

  def test_items_nothing
    resp = @client.get(@item_url)
    assert_equal 400, resp.status
  end

  def test_items_easykey
    resp = @client.get(@item_url, {"easykey" => "DoeBook2005"})
    assert_equal 200, resp.status
    i = JSON.parse(resp.body)
    assert_equal "book", i[0]["type"]
    assert_equal "First Book", i[0]["title"]
    assert_equal "Doe", i[0]["author"][0]["family"]
  end

  def test_items_easykey_key_format
    resp = @client.get(@item_url, {"easykey" => "DoeBook2005", "format" => "key"})
    assert_equal 200, resp.status
    i = JSON.parse(resp.body)
    assert_equal "0_ZBZQ4KMP", i[0]
  end

  def test_items_easykey_alternate_key_format
    resp = @client.get(@item_url, {"easykey" => "doe:2005book", "format" => "key"})
    assert_equal 200, resp.status
    i = JSON.parse(resp.body)
    assert_equal "0_ZBZQ4KMP", i[0]
  end

  def test_items_easykey_bibliography_format
    resp = @client.get(@item_url, {"easykey" => "DoeBook2005", "format" => "bibliography"})
    assert_equal 200, resp.status
    i = JSON.parse(resp.body)
    assert (i[0].key? 'html')
  end

  def test_items_key
    resp = @client.get(@item_url, {"key" => "0_ZBZQ4KMP", "format" => "key"})
    assert_equal 200, resp.status
    i = JSON.parse(resp.body)
    assert_equal "0_ZBZQ4KMP", i[0]
  end

  def test_items_multiple_easykeys
    resp = @client.get(@item_url, {"easykey" => "DoeBook2005,DoeArticle2006", "format" => "key"})
    assert_equal 200, resp.status
    i = JSON.parse(resp.body)
    assert_equal 2, i.length
  end

  def test_items_multiple_keys
    resp = @client.get(@item_url, {"key" => "0_ZBZQ4KMP,0_4T8MCITQ", "format" => "key"})
    assert_equal 200, resp.status
    i = JSON.parse(resp.body)
    assert_equal 2, i.length
  end

  def test_selected
    resp = @client.get(@item_url, {"selected" => "selected" })
    assert_equal 200, resp.status
    i = JSON.parse(resp.body)
  end

  def test_bibliography
    r = {
      "styleId" => "chicago-author-date",
      "citationGroups" => [
        { "citationItems" => [ { "easyKey" => "DoeBook2005" } ],
          "properties" => { "noteIndex" => 0 } }
      ]
    }
    header = { 'Content-Type' => 'application/json' }
    resp = @client.post(@bibliography_url, :header=>header, :body=>JSON.dump(r))
    assert_equal 200, resp.status
    i = JSON.parse(resp.body)
    assert_equal ["(Doe 2005)"], i["citationClusters"]
  end

  def test_bad_bibliography
    r = {
      "styleId" => "chicago-author-date",
      "citationGroups" => [
        { "citationItems" => [ { "easyKey" => "FooBar0000" } ],
          "properties" => { "noteIndex" => 0 } }
      ]
    }
    header = { 'Content-Type' => 'application/json' }
    resp = @client.post(@bibliography_url, :header=>header, :body=>JSON.dump(r))
    assert_equal 400, resp.status
  end

  def test_no_param
    resp = @client.get(@item_url)
    assert_equal 400, resp.status
  end

  def test_bad_easykey
    resp = @client.get(@item_url, {"easykey" => "XXX"})
    assert_equal 400, resp.status
  end

  def test_unicode_easykey
    resp = @client.get(@item_url, {"easykey" => "HüningRelatie2012"})
    assert_equal 200, resp.status
  end

  def test_bad_easykey
    resp = @client.get(@item_url, {"easykey" => "XXX"})
    assert_equal 400, resp.status
  end

  def test_custom_key
    resp = @client.get(@item_url, {"easykey" => "hüning:2012foo"})
    assert_equal 200, resp.status
  end

  def test_collection_search
    resp = @client.get(@item_url, {"collection" => "My%20citations"})
    assert_equal 200, resp.status
  end

  def test_completion
    resp = @client.get(@complete_url, {"easykey" => "Doe"})
    results = JSON.parse(resp.body)
    assert (results.size > 1)
    
    resp = @client.get(@complete_url, {"easykey" => "DoeArticle2006"})
    results = JSON.parse(resp.body)
    assert_equal 1, results.size
  end
end
