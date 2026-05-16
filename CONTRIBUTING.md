# Developing

## Tree-sitter grammar (syntax highlighting)

The grammar source is at `tree-sitter-bml/grammar.js`. After editing, regenerate the C parser:

```sh
cd tree-sitter-bml
tree-sitter generate
```

Test grammar parsing against the corpus:

```sh
tree-sitter test
```

The corpus tests live in `tree-sitter-bml/corpus/*.txt`. Each file contains one or more test cases in the format:

```
==================
Test name
==================
source code
---

(expected S-expression tree)
```

Add a new `.txt` file to `corpus/` to cover new syntax, then run `tree-sitter test` to verify.

### Testing with a file

To see the parse tree for an arbitrary `.bml` file:

```sh
tree-sitter parse path/to/file.bml
```

## Pre-compiled grammar copy

The `grammars/bml/` directory contains a standalone copy of the grammar used by the Zed extension WASM packaging. Any changes to `tree-sitter-bml/grammar.js` must be mirrored there:

```sh
# Sync grammar.js changes manually, then:
cd grammars/bml
tree-sitter generate
tree-sitter test
```
