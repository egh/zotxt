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
    resp = @client.get(@item_url, {"easykey" => "DoeBook2006"})
    assert_equal resp.status, 200
    i = JSON.parse(resp.body)
    assert_equal i["type"], "book"
    assert_equal i["title"], "Book"
    assert_equal i["author"][0]["family"], "Doe"
  end

  def test_bibliography
    r = {
      "styleId" => "chicago-author-date",
      "citations" => [
        { "citationItems" => [ { "easyKey" => "DoeBook2006" } ] }
                     ],
      "properties" => { "noteIndex" => 0 }
    }
    header = { 'Content-Type' => 'application/json' }
    resp = @client.post(@bibliography_url, :header=>header, :body=>JSON.dump(r))
    assert_equal resp.status, 200
  end

  def test_no_param
    resp = @client.get(@item_url)
    assert_equal resp.status, 400
  end

  def test_bad_easykey
    resp = @client.get(@item_url, {"easykey" => "XXX"})
    assert_equal resp.status, 400
  end

  def test_bad_easykey
    resp = @client.get(@item_url, {"easykey" => "XXX"})
    assert_equal resp.status, 400
  end
end
