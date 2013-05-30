require 'minitest/autorun'
require 'httpclient'
require 'json'

class ZotxtTest < MiniTest::Unit::TestCase
  def setup
    @client = HTTPClient.new
    @base_url = "http://localhost:23119/zotxt"
    @item_url = "#{@base_url}/item"
    @bibliography_url = "#{@base_url}/bibliography"
  end

  def test_item_easykey
    resp = @client.get(@item_url, {"easykey" => "DoeBook2005"})
    assert_equal 200, resp.status
    i = JSON.parse(resp.body)
    assert_equal "book", i["type"]
    assert_equal "First Book", i["title"]
    assert_equal "Doe", i["author"][0]["family"]
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
