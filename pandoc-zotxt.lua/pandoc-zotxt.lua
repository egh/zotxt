#!/usr/local/bin/lua
--- pandoc-zotxt.lua Looks up citations in Zotero and adds references. 
--
-- @release 0.1
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
-- See <https://github.com/egh/zotxt> for details.
local ZOTERO_LOOKUP_URL = 'http://127.0.0.1:23119/zotxt/items?easykey='


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
    local cjson
    cjson, json = pcall(function() return require 'cjson' end)
    if cjson then
        json.encode_number_precision(1)
    else
        json = require 'lunajson'
    end
end


-- Functions
-- =========

--- Gets bibliographic data from Zotero.
-- 
-- Uses the constant ZOTERO_LOOKUP_URL (see above).
-- See <https://github.com/egh/zotxt> for details.
--
-- @param citekey A citation key.
--
-- @return If the cited source was found, bibliographic data for
--         that source as CSL JSON string.
-- @return Otherwise, nil and and error message.
function get_source_data (citekey)
    local _, reply = pandoc.mediabag.fetch(ZOTERO_LOOKUP_URL .. citekey, '.')
    if reply:sub(1, 1) ~= '[' then return nil, reply end
    return reply
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


do
    local citekeys = {}

    --- Collects all citekeys used in a document.
    --
    -- Saves them into the variable ``citekeys``,
    -- which is shared with ``add_references``.
    --
    -- @param citations A pandoc.Cite element.
    function collect_sources (citations)
        for _, citation in ipairs(citations.c[1]) do
            if citekeys[citation.id] == nil then
                citekeys[citation.id] = true
            end
        end
    end


    --- Adds all cited sources to the metadata block of a document.
    --
    -- Reads citekeys of cited sources from the variable ```citekeys``,
    -- which is shared with ``collect_sources``.
    --
    -- @param meta The metadata block of a document, as Pandoc.Meta.
    --
    -- @return If sources were found, an updated metadata block, 
    --         as Pandoc.Meta, with the field ```references`` added.
    -- @return Otherwise, nil.
    --
    -- Prints error messages to STDERR if a source cannot be found.
    function add_references (meta)
        local sources = {}
        for citekey, _ in pairs(citekeys) do
            local data, msg = get_source_data(citekey)
            if data == nil then
                io.stderr:write('pandoc-zotxt.lua: ' .. msg .. '\n')
            else
                source = stringify_values(json.decode(data)[1])
                source.id = citekey
                table.insert(sources, source)
            end
        end
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

return {{Cite = collect_sources}, {Meta = add_references}, {Pandoc = call_citeproc}}
