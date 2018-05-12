#!/usr/local/bin/lua
--- pandoc-zotxt.lua Looks up citations in Zotero and adds references. 
--
-- @release 0.2.2
-- @author Odin Kroeger
-- @copyright 2018 Odin Kroeger
--
-- Permission is hereby granted, free of charge, to any person obtaining a copy
-- of this software and associated documentation files (the "Software"), to
-- deal in the Software without restriction, including without limitation the
-- rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
-- sell copies of the Software, and to permit persons to whom the Software is
-- furnished to do so, subject to the following conditions:
--
-- The above copyright notice and this permission notice shall be included in
-- all copies or substantial portions of the Software.
--
-- THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
-- IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
-- FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
-- AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
-- LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
-- FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
-- IN THE SOFTWARE.

-- Constants
-- =========

-- The URL to lookup citation data.
-- See ``get_source_json`` and <https://github.com/egh/zotxt> for details.
local ZOTXT_QUERY_URL = 'http://localhost:23119/zotxt/items?'

-- Keytypes.
-- See ``get_source_json`` and <https://github.com/egh/zotxt> for details.
local ZOTXT_KEYTYPES = {'easykey', 'betterbibtexkey', 'key'}


-- Boilerplate
-- ===========

local package = package
local text = require 'text'

do
    local s_dir = string.match(PANDOC_SCRIPT_FILE, '(.-)[\\/][^\\/]-$') or '.'
    local path_sep = package.config:sub(1, 1)
    local lua_vers = {}
    for _, v in ipairs({_VERSION:sub(5, 7), '5.3'}) do lua_vers[v] = true end
    for k, _ in pairs(lua_vers) do
        package.path = package.path .. ';' ..
            table.concat({s_dir, 'share', 'lua', k, '?.lua'}, path_sep)
        package.cpath = package.cpath .. ';' .. 
            table.concat({s_dir, 'lib', 'lua', k, '?.so'}, path_sep)
    end
end

-- C-JSON is slightly faster; just in case you're writing a book.
local json
do
    local cjson_loaded
    cjson_loaded, json = pcall(function() return require 'cjson' end)
    if cjson_loaded then json.encode_number_precision(1)
    else json = require 'lunajson' end
end


-- Functions
-- =========

do
    local keytypes = ZOTXT_KEYTYPES
    local fetch = pandoc.mediabag.fetch

    ---  Gets bibliographic data from Zotero.
    --
    -- Tries to get bibliographic data by citation key, trying different
    -- types of citation keys, starting with the last keytype using which
    -- a lookup was successful.
    --
    -- The constant ``ZOTXT_QUERY_URL`` defines where to get data from.
    -- The constant ``ZOTXT_KEYTYPES`` defines what keytypes to try.
    -- See <https://github.com/egh/zotxt> for details.
    --
    -- @return If the cited source was found, bibliographic data for
    --         that source as CSL JSON string.
    -- @return Otherwise, nil and the error message of the lookup
    --         attempt for the first keytype.
    function get_source_json (citekey)
        local _, reply
        for i = 1, #keytypes do
            local query_url = ZOTXT_QUERY_URL .. keytypes[i] .. '=' .. citekey
            _, reply = fetch(query_url, '.')
            if reply:sub(1, 1) == '[' then
                if i > 1 then
                    local keytype = table.remove(keytypes, i)
                    table.insert(keytypes, 1, keytype)
                end
                return reply
            end
        end
        return nil, reply
    end
end


--- Converts all numbers in a multi-dimensional table to strings.
--
-- Also converts floating point numbers to integers.
-- This is needed because in JavaScript, all numbers are
-- floating point numbers. But Pandoc expects integers.
--
-- @parem data Data of any type.
--
-- @return The given data, with all numbers converted into strings.
function stringify_values (data)
    local data_type = type(data)
    if data_type == 'table' then
        local s = {}
        for k, v in pairs(data) do s[k] = stringify_values(v) end
        return s
    elseif data_type == 'number' then
        return tostring(math.floor(data))
    else
        return data
    end
end


--- Retrieves bibliographic data for sources from Zotero.
-- 
-- @param citekeys A list of citation keys.
--
-- @return The cited sources,
--         as a list of CSL compliant multi-dimensional tables.
--
-- Prints error messages to STDERR if a source cannot be found.
function get_sources (citekeys)
    local sources = {}
    for _, citekey in ipairs(citekeys) do
        local data, err = get_source_json(citekey)
        if data == nil then
            io.stderr:write('pandoc-zotxt.lua: ' .. err .. '\n')
        else
            local source = stringify_values(json.decode(data)[1])
            source.id = citekey
            table.insert(sources, source)
        end
    end
    return sources
end


do
    local citekeys = {}
    local seen = {}

    --- Collects all citekeys used in a document.
    --
    -- Saves them into the variable ``citekeys``,
    -- which is shared with ``add_references``.
    --
    -- @param citations A pandoc.Cite element.
    function collect_sources (citations)
        for _, citation in ipairs(citations.citations) do
            id = citation.id
            if seen[id] == nil then
                seen[id] = true
                table.insert(citekeys, id)
            end
        end
    end


    --- Adds all cited sources to the metadata block of a document.
    --
    -- Reads citekeys of cited sources from the variable ```citekeys``,
    -- which is shared with ``collect_sources``.
    --
    -- @param meta The metadata block of a document, as pandoc.Meta.
    --
    -- @return If sources were found, an updated metadata block, 
    --         as pandoc.Meta, with the field ```references`` added.
    -- @return Otherwise, nil.
    function add_references (meta)
        sources = get_sources(citekeys)
        if #sources > 0 then
            meta['references'] = sources 
            return meta
        end
    end
end


--- Calls citeproc, if requested.
--
-- If the metadata field ``call-citeproc`` is set to true,
-- calls citeproc to process citations.
--
-- @param doc The document in which to process citations, as pandoc.Pandoc.
--
-- @return If ``call-citeproc`` is true, the given document,
--         with citations processed, as pandoc.Pandoc.
-- @return Otherwise, nil.
function call_citeproc (doc)
    if doc.meta['call-citeproc'] == true then
        return pandoc.utils.run_json_filter(doc, 'pandoc-citeproc')
    end
end

return {{Cite = collect_sources, Meta = add_references, Pandoc = call_citeproc}}
