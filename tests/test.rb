require 'minitest/autorun'
require 'httpclient'
require 'json'

class ZotxtTest < MiniTest::Unit::TestCase
  def setup
    @client = HTTPClient.new
    @base_url = "http://localhost:23119/zotxt"
  end

  def test_item_easykey
    resp = @client.get("#{@base_url}/item", {"easykey" => "DoeBook2006"})
    assert_equal resp.status, 200
    i = JSON.parse(resp.body)
    assert_equal i["type"], "book"
    assert_equal i["title"], "Book"
    assert_equal i["author"][0]["family"], "Doe"
  end

  def test_no_param
    resp = @client.get("#{@base_url}/item")
    assert_equal resp.status, 400
  end

  def test_bad_easykey
    resp = @client.get("#{@base_url}/item", {"easykey" => "XXX"})
    assert_equal resp.status, 400
  end

  def test_bad_easykey
    resp = @client.get("#{@base_url}/item", {"easykey" => "XXX"})
    assert_equal resp.status, 400
  end
end
