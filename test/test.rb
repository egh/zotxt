# -*- coding: utf-8 -*-
require 'minitest/autorun'
require 'httpclient'
require 'json'
require 'open3'

class ZotxtTest < MiniTest::Test
  def setup
    @client = HTTPClient.new
    @base_url = "http://127.0.0.1:23119/zotxt"
    @item_url = "#{@base_url}/items"
    @complete_url = "#{@base_url}/complete"
    @bibliography_url = "#{@base_url}/bibliography"
    @search_url = "#{@base_url}/search"
    @select_url = "#{@base_url}/select"
    @doe_first_book_key = find_item_key("doe first book 2005")
    @doe_article_key = find_item_key("doe article 2006")
    @roe_doe_hyphens_key = find_item_key("roe doe hyphens")
  end

  def find_item_key(q)
    resp = @client.get(@search_url, {"q" => q, "format" => "key"})
    JSON.parse(resp.body)[0]
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
    assert_equal @doe_first_book_key, i[0]
  end

  def test_items_easykey_json_format
    resp = @client.get(@item_url, {"easykey" => "DoeBook2005", "format" => "json"})
    assert_equal 200, resp.status
    i = JSON.parse(resp.body)
    assert_equal({'id'=>"DoeFirstBook2005",
                  'type'=>'book',
                  'title'=>'First Book',
                  'publisher'=>'Cambridge University Press',
                  'author'=>[{'family'=>'Doe', 'given'=>'John'}],
                  'issued'=>{'date-parts'=>[[2005]]},
                  'publisher-place'=>'Cambridge'
                 }, i[0])
  end

  def test_items_easykey_paths_format
    resp = @client.get(@item_url, {'easykey' => 'doe:2006article', 'format' => 'paths'})
    assert_equal 200, resp.status
    i = JSON.parse(resp.body)
    assert_equal(@doe_article_key, i[0]['key'])
    # assert_match not working?
    assert(i[0]['paths'][0] =~ %r{zotero/storage/QWFHQ73F/doe$})

    # should be fetched afer deletion
    File.unlink(i[0]['paths'][0])
    resp = @client.get(@item_url, {'easykey' => 'doe:2006article', 'format' => 'paths'})
    assert_equal 200, resp.status
    i = JSON.parse(resp.body)
    assert_equal(@doe_article_key, i[0]['key'])
    # assert_match not working?
    assert(i[0]['paths'][0] =~ %r{zotero/storage/QWFHQ73F/doe$}, 'no path')
  end

  def test_items_easykey_two_word
    key = find_item_key("united nations wonderful")
    resp = @client.get(@item_url, {"easykey" => "united_nations:2005book", "format" => "key"})
    assert_equal 200, resp.status
    i = JSON.parse(resp.body)
    assert_equal key, i[0]
  end

  def test_items_easykey_double_name
    key = find_item_key("roe doe double")
    resp = @client.get(@item_url, {"easykey" => "roe_doe:2015double", "format" => "key"})
    assert_equal 200, resp.status
    i = JSON.parse(resp.body)
    assert_equal key, i[0]
  end

  def test_items_easykey_hyphenated_name
    resp = @client.get(@item_url, {"easykey" => "roe-doe:2015hyphens", "format" => "key"})
    assert_equal 200, resp.status
    i = JSON.parse(resp.body)
    assert_equal @roe_doe_hyphens_key, i[0]
  end

  def test_items_easykey_alternate_key_format
    resp = @client.get(@item_url, {"easykey" => "doe:2005book", "format" => "key"})
    assert_equal 200, resp.status
    i = JSON.parse(resp.body)
    assert_equal @doe_first_book_key, i[0]
  end

  def test_easykey_two_items
    resp = @client.get(@item_url, {"easykey" => "doe:2005book,roe-doe:2015hyphens", "format" => "key"})
    assert_equal 200, resp.status
    i = JSON.parse(resp.body)
    assert_equal [@doe_first_book_key, @roe_doe_hyphens_key].sort, i.sort
  end

  def test_betterbibtexkey
    resp = @client.get(@item_url, {"betterbibtexkey" => "DoeFirstBook2005", "format" => "key"})
    assert_equal 200, resp.status
    i = JSON.parse(resp.body)
    assert_equal [@doe_first_book_key], i
  end

  def test_betterbibtexkey_two_items
    resp = @client.get(@item_url, {"betterbibtexkey" => "DoeFirstBook2005,DoeArticle2006", "format" => "key"})
    assert_equal 200, resp.status
    i = JSON.parse(resp.body)
    assert_equal [@doe_first_book_key,@doe_article_key].sort, i.sort
  end

# doesn't work
#  def test_betterbibtexkey_hyphen
#    resp = @client.get(@item_url, {"betterbibtexkey" => "Roe-Doe2005", "format" => "key"})
#    assert_equal 200, resp.status
#    i = JSON.parse(resp.body)
#    assert_equal ["xyz"], i
#  end

  def test_items_easykey_bibliography_format
    resp = @client.get(@item_url, {"easykey" => "DoeBook2005", "format" => "bibliography"})
    assert_equal 200, resp.status
    i = JSON.parse(resp.body)
    assert(i[0].key? 'html')

    # with style
    resp = @client.get(@item_url, {"easykey" => "DoeBook2005", "format" => "bibliography", "style" => "http://www.zotero.org/styles/chicago-note-bibliography"})
    assert_equal 200, resp.status
    i = JSON.parse(resp.body)
    assert(i[0].key? 'html')

    # with short style
    resp = @client.get(@item_url, {"easykey" => "DoeBook2005", "format" => "bibliography", "style" => "chicago-note-bibliography"})
    assert_equal 200, resp.status
    i = JSON.parse(resp.body)
    assert(i[0].key? 'html')
  end

  def test_items_key
    resp = @client.get(@item_url, {"key" => @doe_first_book_key, "format" => "key"})
    assert_equal 200, resp.status
    i = JSON.parse(resp.body)
    assert_equal @doe_first_book_key, i[0]
  end

  def test_items_bad_key
    resp = @client.get(@item_url, {"key" => "1_ZBZQ4KMXXXX", "format" => "key"})
    assert_equal 400, resp.status
  end

  def test_items_multiple_easykeys
    resp = @client.get(@item_url, {"easykey" => "DoeBook2005,DoeArticle2006", "format" => "key"})
    assert_equal 200, resp.status
    i = JSON.parse(resp.body)
    assert_equal 2, i.length
  end

  def test_items_multiple_keys
    resp = @client.get(@item_url, {"key" => "#{@doe_first_book_key},#{@doe_article_key}", "format" => "key"})
    assert_equal 200, resp.status
    i = JSON.parse(resp.body)
    assert_equal 2, i.length
  end

  def test_selected
    resp = @client.get(@item_url, {"selected" => "selected" })
    assert_equal 200, resp.status
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

  def test_ambiguous_bibliography
    r = {
      "styleId" => "chicago-author-date",
      "citationGroups" => [
        { "citationItems" => [ { "easyKey" => "jenkins:2011jesus" } ],
          "properties" => { "index" => 0, "noteIndex" => 0 } },
        { "citationItems" => [ { "easyKey" => "jenkins:2009lost" } ],
          "properties" => { "index" => 1, "noteIndex" => 0 } }
      ]
    }
    header = { 'Content-Type' => 'application/json' }
    resp = @client.post(@bibliography_url, :header=>header, :body=>JSON.dump(r))
    assert_equal 200, resp.status
    i = JSON.parse(resp.body)
    assert_equal ["(J. P. Jenkins 2011)", "(P. Jenkins 2009)"], i["citationClusters"]
  end

  def test_bibliography_key
    key = find_item_key("doe 2005 first book")
    r = {
      "styleId" => "chicago-author-date",
      "citationGroups" => [
       { "citationItems" => [ { "key" => key } ],
         "properties" => { "noteIndex" => 0 }
       }
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

  def test_all
    resp = @client.get(@item_url, {"all" => "all", "format" => "key"})
    assert_equal 200, resp.status
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

  def test_accent_easykey_export
    key = find_item_key("acćénts")
    resp = @client.get(@item_url, {"key" => key, "format" => "easykey"})
    assert_equal 200, resp.status
    results = JSON.parse(resp.body)
    assert_equal "hüáéèñ:2015acćénts", results[0]
  end

  def test_accent_easykey_fetch
    key = find_item_key("acćénts")
    resp = @client.get(@item_url, {"easykey" => "hüáéèñ:2015acćénts", "format" => "key"})
    assert_equal 200, resp.status
    results = JSON.parse(resp.body)
    assert_equal key, results[0]
  end

  def test_duplicate_in_group_library
    resp = @client.get(@item_url, {"easykey" => "doe:2015duplicated", "format" => "key"})
    assert_equal 200, resp.status
    results = JSON.parse(resp.body)
    assert_equal "1_UCA4RC22", results[0]
  end

  def test_collection_search
    resp = @client.get(@item_url, {"collection" => "My citations"})
    assert_equal 200, resp.status
  end

  def test_format_bibtex
    resp = @client.get(@item_url, {"key" => @doe_article_key, "format" => "bibtex"})
    assert_equal 200, resp.status
    assert_match(
      Regexp.new(
        Regexp.quote("""
@article{doe_article_2006,
	title = {Article},
	volume = {6},
	journal = {Journal of Generic Studies},
	author = {Doe, John},
	year = {2006},
	pages = {33--34}""")),
      resp.body)
  end

  def test_format_bibliography
    resp = @client.get(@item_url, {"key" => @doe_article_key, "format" => "bibliography"})
    assert_equal 200, resp.status
    results = JSON.parse(resp.body)
    assert_equal({"text"=>"Doe, John. “Article.” Journal of Generic Studies 6 (2006): 33–34.",
                  "html"=>"""<div class=\"csl-bib-body\" style=\"line-height: 1.35; margin-left: 2em; text-indent:-2em;\">
  <div class=\"csl-entry\">Doe, John. “Article.” <i>Journal of Generic Studies</i> 6 (2006): 33–34.</div>
  <span class=\"Z3988\" title=\"url_ver=Z39.88-2004&amp;ctx_ver=Z39.88-2004&amp;rfr_id=info%3Asid%2Fzotero.org%3A2&amp;rft_val_fmt=info%3Aofi%2Ffmt%3Akev%3Amtx%3Ajournal&amp;rft.genre=article&amp;rft.atitle=Article&amp;rft.jtitle=Journal%20of%20Generic%20Studies&amp;rft.volume=6&amp;rft.aufirst=John&amp;rft.aulast=Doe&amp;rft.au=John%20Doe&amp;rft.date=2006&amp;rft.pages=33-34&amp;rft.spage=33&amp;rft.epage=34\"></span>
</div>""",
                   "key"=>@doe_article_key}, results[0])
  end


  def test_format_quickbib
    resp = @client.get(@item_url, {"key" => @doe_article_key, "format" => "quickBib"})
    assert_equal 200, resp.status
    results = JSON.parse(resp.body)
    assert_equal({ "key" => "1_4T8MCITQ", "quickBib" => "Doe, John - 2006 - Article"}, results[0])
  end

  def test_format_easykey
    resp = @client.get(@item_url, {"key" => @doe_article_key, "format" => "easykey"})
    assert_equal 200, resp.status
    results = JSON.parse(resp.body)
    assert_equal "doe:2006article", results[0]
  end

  def test_format_easykey_clean_html
    resp = @client.get(@item_url, {"easykey" => "doe:2007why", "format" => "easykey"})
    assert_equal 200, resp.status
    results = JSON.parse(resp.body)
    assert_equal "doe:2007why", results[0]
  end

  def test_select
    resp = @client.get(@item_url, {"selected" => "t", "format" => "easykey"})
    assert_equal 200, resp.status
    results = JSON.parse(resp.body)
    assert results == [] || results == ["doe:2006article"]
  end

  def test_format_betterbibtex
    resp = @client.get(@item_url, {"key" => @doe_article_key, "format" => "betterbibtexkey"})
    assert_equal 200, resp.status
    results = JSON.parse(resp.body)
    assert_equal "DoeArticle2006", results[0]
  end

  def test_format_export_uuid
    resp = @client.get(@item_url, {"key" => @doe_article_key, "format" => "248bebf1-46ab-4067-9f93-ec3d2960d0cd"})
    assert_equal 200, resp.status
    assert_equal 'text/plain; charset=UTF-8', resp.content_type
    assert_equal "{ | Doe, 2006 | | |zu:1254:#{@doe_article_key[2..-1]}}", resp.body
  end

  def test_format_export_bad_uuid
    resp = @client.get(@item_url, {"key" => @doe_article_key, "format" => "248bebf1-46ab-dead-beef-ec3d2960d0cd"})
    assert_equal 400, resp.status
  end

  def test_format_key
    resp = @client.get(@item_url, {"key" => @doe_article_key, "format" => "key"})
    assert_equal 200, resp.status
    results = JSON.parse(resp.body)
    assert_equal @doe_article_key, results[0]
  end

  def test_format_json
    resp = @client.get(@item_url, {"key" => @doe_article_key, "format" => "json"})
    assert_equal 200, resp.status
    results = JSON.parse(resp.body)
    assert_equal({"id"=>"DoeArticle2006",
      "type"=>"article-journal",
      "title"=>"Article",
      "container-title"=>"Journal of Generic Studies",
      "page"=>"33-34",
      "volume"=>"6",
      "author"=>[{"family"=>"Doe", "given"=>"John"}],
      "issued"=>{"date-parts"=>[[2006]]}
                   }, results[0])
  end

  def test_completion
    resp = @client.get(@complete_url, {"easykey" => "doe"})
    results = JSON.parse(resp.body)
    assert (results.size > 4)

    resp = @client.get(@complete_url, {"easykey" => "doe:"})
    results = JSON.parse(resp.body)
    assert (results.size > 4)

    resp = @client.get(@complete_url, {"easykey" => "doe:20"})
    results = JSON.parse(resp.body)
    assert (results.size > 4)

    resp = @client.get(@complete_url, {"easykey" => "doe:2006"})
    results = JSON.parse(resp.body)
    assert_equal ["doe:2006article"], results

    resp = @client.get(@complete_url, {"easykey" => "doe:2006art"})
    results = JSON.parse(resp.body)
    assert_equal ["doe:2006article"], results
  end

  def test_search
    resp = @client.get(@search_url, {"q" => "doe article", "format" => "key"})
    assert_equal 200, resp.status
    results = JSON.parse(resp.body)
    assert_equal @doe_article_key, results[0]
  end

  def test_search_everything_standalone_note
    resp = @client.get(@search_url, {"q" => "standalone", "method" => "everything", "format" => "key"})
    assert_equal 200, resp.status
    results = JSON.parse(resp.body)
    assert !results.index('1_DAU3K5SU').nil?
  end

  def test_select
    resp = @client.get(@select_url, {"key" => @doe_article_key})
    assert_equal 200, resp.status
    resp = @client.get(@select_url, {"easykey" => "doe:2006article"})
    assert_equal 200, resp.status
    # bad key
    resp = @client.get(@select_url, {"key" => "1_4T8MCITQXXX"})
    assert_equal 400, resp.status
    resp = @client.get(@select_url, {"easykey" => "XXX"})
    assert_equal 400, resp.status
  end

  def test_python
    out = `echo @hüning:2012foo | pandoc -F pandoc-zotxt`
    assert_equal "<p><span class=\"citation\">@hüning:2012foo</span></p>\n", out
  end
end
