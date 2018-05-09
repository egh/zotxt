# 1.2.0

* For ease of embedded use, the decoder and the SAX parser are made self-contained one file implementation.
* `1` is decoded as an integer on Lua 5.3.
* Number parsing routine is changed. Now `-?[0-9][-+.A-Za-z0-9]*` is detected as a number, and its conformance to JSON spec is checked.
* Automated testing.
* Cool logo :)
* Bug fixes.
