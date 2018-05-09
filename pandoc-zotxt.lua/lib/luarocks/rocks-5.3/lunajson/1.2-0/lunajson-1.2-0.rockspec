package = "lunajson"
version = "1.2-0"
source = {
	url = "git://github.com/grafi-tt/lunajson.git",
	tag = "1.2"
}
description = {
	summary = "A strict and fast JSON parser/decoder/encoder written in pure Lua",
	detailed = [[
		Lunajson features SAX-style JSON parser and simple JSON decoder/encoder. It is tested on Lua 5.1, Lua 5.2, Lua 5.3, and LuaJIT.
		It is written only in pure Lua and has no dependencies. Even though, since it is carefully optimized, decoding speed even matches to other lpeg-based JSON modules.
		The parser and decoder reject inputs not conforms the JSON specification (ECMA-404), and the encoder always yields outputs conforming the specification.
		The parser and decoder also handle surrogate pair correctly.
	]],
	homepage = "https://github.com/grafi-tt/lunajson",
	maintainer = "Shunsuke Shimizu",
	license = "MIT/X11"
}
dependencies = {
	"lua >= 5.1"
}
build = {
	type = 'builtin',
	modules = {
		['lunajson'] = 'src/lunajson.lua',

		['lunajson.decoder'] = 'src/lunajson/decoder.lua',
		['lunajson.encoder'] = 'src/lunajson/encoder.lua',
		['lunajson.sax'    ] = 'src/lunajson/sax.lua',
	}
}
