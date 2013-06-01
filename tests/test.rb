require 'minitest/autorun'
require 'httpclient'
require 'json'

class ZotxtTest < MiniTest::Unit::TestCase
  def setup
    @client = HTTPClient.new
    @base_url = "http://localhost:23119/zotxt"
    @item_url = "#{@base_url}/items"
    @bibliography_url = "#{@base_url}/bibliography"
  end

  def test_item_nothing
    resp = @client.get(@item_url)
    assert_equal 400, resp.status
  end

  def test_item_easykey
    resp = @client.get(@item_url, {"easykey" => "DoeBook2005"})
    assert_equal 200, resp.status
    i = JSON.parse(resp.body)
    assert_equal "book", i[0]["type"]
    assert_equal "First Book", i[0]["title"]
    assert_equal "Doe", i[0]["author"][0]["family"]
  end

  def test_item_easykey_key_format
    resp = @client.get(@item_url, {"easykey" => "DoeBook2005", "format" => "key"})
    assert_equal 200, resp.status
    i = JSON.parse(resp.body)
    assert_equal "0_ZBZQ4KMP", i[0]['key']
  end

  def test_item_easykey_bibliography_format
    resp = @client.get(@item_url, {"easykey" => "DoeBook2005", "format" => "bibliography"})
    assert_equal 200, resp.status
    i = JSON.parse(resp.body)
    assert (i[0].key? 'html')
  end

  def test_item_key
    resp = @client.get(@item_url, {"key" => "0_ZBZQ4KMP", "format" => "key"})
    assert_equal 200, resp.status
    i = JSON.parse(resp.body)
    assert_equal "0_ZBZQ4KMP", i[0]['key']
  end

  def test_bibliography
    r = {
      "styleId" => "chicago-author-date",
      "citations" => [
        { "citationItems" => [ { "easyKey" => "DoeBook2005" } ] }
      ],
      "properties" => { "noteIndex" => 0 }
    }
    header = { 'Content-Type' => 'application/json' }
    resp = @client.post(@bibliography_url, :header=>header, :body=>JSON.dump(r))
    assert_equal 200, resp.status
  end

  def test_bad_bibliography
    r = {
      "styleId" => "chicago-author-date",
      "citations" => [
        { "citationItems" => [ { "easyKey" => "FooBar0000" } ] }
      ],
      "properties" => { "noteIndex" => 0 }
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

  def test_bad_easykey
    resp = @client.get(@item_url, {"easykey" => "XXX"})
    assert_equal 400, resp.status
  end
end
