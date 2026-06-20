#include "tree_sitter/parser.h"

// External tokens that a regular-expression token cannot express because they
// require counting nested delimiters:
//
//   block_comment  -- `/* ... */` with NESTED `/* */` pairs (beemel's lexer
//                     tracks comment depth: skip_whitespace_and_comments).
//   asm_body       -- the `{ ... }` body of an `asm` statement, where the body
//                     may itself contain balanced `{ }` (beemel scans the body
//                     with a brace-depth counter).
//   pio_body       -- the `{ ... }` body of a `pio NAME { ... }` block, captured
//                     verbatim (it is a foreign PIO ISA, not bml). Same balanced-
//                     brace scan as asm_body.
//
// All are self-contained tokens, so the scanner carries no cross-call state:
// create/destroy/serialize/deserialize are trivial.

enum TokenType {
  BLOCK_COMMENT,
  ASM_BODY,
  PIO_BODY,
};

void *tree_sitter_bml_external_scanner_create(void) { return NULL; }
void tree_sitter_bml_external_scanner_destroy(void *payload) { (void)payload; }
unsigned tree_sitter_bml_external_scanner_serialize(void *payload, char *buffer) {
  (void)payload;
  (void)buffer;
  return 0;
}
void tree_sitter_bml_external_scanner_deserialize(void *payload, const char *buffer,
                                                  unsigned length) {
  (void)payload;
  (void)buffer;
  (void)length;
}

static inline void advance(TSLexer *lexer) { lexer->advance(lexer, false); }
static inline void skip(TSLexer *lexer) { lexer->advance(lexer, true); }

static inline bool is_space(int32_t c) {
  return c == ' ' || c == '\t' || c == '\r' || c == '\n' || c == '\f' || c == '\v';
}

// `/* ... */` allowing nesting. Assumes the next char is `/`. Returns false (so
// the runtime restores the lexer position) when this is not actually a block
// comment, or when the comment is unterminated at EOF.
static bool scan_block_comment(TSLexer *lexer) {
  advance(lexer); // consume '/'
  if (lexer->lookahead != '*') return false;
  advance(lexer); // consume '*'

  unsigned depth = 1;
  for (;;) {
    if (lexer->eof(lexer)) return false; // unterminated
    if (lexer->lookahead == '*') {
      advance(lexer);
      if (lexer->lookahead == '/') {
        advance(lexer);
        if (--depth == 0) break;
      }
    } else if (lexer->lookahead == '/') {
      advance(lexer);
      if (lexer->lookahead == '*') {
        advance(lexer);
        depth++;
      }
    } else {
      advance(lexer);
    }
  }

  lexer->result_symbol = BLOCK_COMMENT;
  return true;
}

// `{ ... }` with balanced inner braces. Assumes the next char is `{`. Returns
// false at EOF before the body closes. Shared by asm_body and pio_body, which
// differ only in the result symbol.
static bool scan_braced_body(TSLexer *lexer, enum TokenType symbol) {
  advance(lexer); // consume '{'

  unsigned depth = 1;
  for (;;) {
    if (lexer->eof(lexer)) return false; // unterminated
    if (lexer->lookahead == '{') {
      advance(lexer);
      depth++;
    } else if (lexer->lookahead == '}') {
      advance(lexer);
      if (--depth == 0) break;
    } else {
      advance(lexer);
    }
  }

  lexer->result_symbol = symbol;
  return true;
}

bool tree_sitter_bml_external_scanner_scan(void *payload, TSLexer *lexer,
                                           const bool *valid_symbols) {
  (void)payload;

  // Skip leading whitespace so the scanner reaches the `{`/`/*` even when it is
  // invoked mid-gap (e.g. the space in `asm   {`). Skipped whitespace is not
  // part of any token; a failed probe (`//`, division `/`, a non-`{` after
  // `asm`) returns false and the runtime restores the position.
  while (is_space(lexer->lookahead)) skip(lexer);

  if (valid_symbols[ASM_BODY] && lexer->lookahead == '{') {
    return scan_braced_body(lexer, ASM_BODY);
  }

  if (valid_symbols[PIO_BODY] && lexer->lookahead == '{') {
    return scan_braced_body(lexer, PIO_BODY);
  }

  if (valid_symbols[BLOCK_COMMENT] && lexer->lookahead == '/') {
    return scan_block_comment(lexer);
  }

  return false;
}
