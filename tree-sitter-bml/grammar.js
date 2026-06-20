/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const PREC = {
  PRIMARY: 0,
  CALL: 7,
  UNARY: 8,
  FIELD_ACCESS: 9,
  ENUM_VARIANT: 10,
  AS_CAST: 11,
  MULTIPLICATIVE: 12,
  ADDITIVE: 13,
  SHIFT: 14,
  BITWISE: 15,
  COMPARISON: 16,
  EQUALITY: 17,
  LOGICAL_AND: 18,
  LOGICAL_OR: 19,
};

module.exports = grammar({
  name: 'bml',

  extras: $ => [
    $.line_comment,
    $.block_comment,
    /\s/,
  ],

  // Tokens that need delimiter counting (impossible in a regex): nested block
  // comments and the balanced-brace `asm` body. Implemented in src/scanner.c.
  externals: $ => [
    $.block_comment,
    $.asm_body,
    $.pio_body,
  ],

  word: $ => $.identifier,

  conflicts: $ => [
    [$._type, $._expression],
    [$._type, $._primary_expression],
    [$._primary_expression, $._type],
    [$.named_type, $._expression],
    [$.parameter_list],
    [$._lvalue, $._primary_expression],
    [$._lvalue, $._expression],
    [$._statement, $.block_expression],
    [$._primary_expression, $.struct_expression],
    // `a.b` may begin a qualified struct-init (`a.b { .. }`), a field access, or
    // an lvalue; GLR picks by what follows the qualified name.
    [$._lvalue, $._primary_expression, $.struct_expression],
    // `(*p)` may be a parenthesized lvalue or a group expression; GLR picks the
    // lvalue when an `=` follows the `.field`, the expression otherwise.
    [$._lvalue, $.group_expression],
    [$.match_statement, $.match_expression],
    [$.if_statement, $.if_expression],
  ],

  rules: {
    source_file: $ => repeat($._item),

    // ─── Items ────────────────────────────────────────────────────

    _item: $ => choice(
      $.function_definition,
      $.extern_function_declaration,
      $.static_definition,
      $.const_definition,
      $.struct_definition,
      $.enum_definition,
      $.peripheral_definition,
      $.peripheral_type_definition,
      $.peripheral_instance,
      $.register_definition,
      $.field_definition,
      $.import_statement,
      $.owns_statement,
      $.comptime_assert,
      $.pio_definition,
    ),

    // `pio NAME { ...raw PIO assembly... }` -- the body is a foreign 16-bit ISA
    // captured verbatim by the external scanner (like asm_body), desugared by
    // the compiler to `const NAME_PROGRAM: [u16; N]` + metadata consts.
    pio_definition: $ => seq(
      'pio',
      field('name', $.identifier),
      $.pio_body,
    ),

    // ─── Function definitions ─────────────────────────────────────

    function_definition: $ => seq(
      optional('export'),
      'fn',
      field('name', $.identifier),
      field('parameters', $.parameter_list),
      optional(field('return_type', $.return_type)),
      repeat($.function_annotation),
      field('body', $.block),
    ),

    extern_function_declaration: $ => seq(
      optional('export'),
      'extern',
      'fn',
      field('name', $.identifier),
      field('parameters', $.parameter_list),
      optional(field('return_type', $.return_type)),
      repeat($.function_annotation),
      ';',
    ),

    parameter_list: $ => seq(
      '(',
      commaSep($.parameter),
      ')',
    ),

    parameter: $ => seq(
      field('name', $.identifier),
      ':',
      field('type', $._type),
    ),

    return_type: $ => seq('->', $._type),

    function_annotation: $ => choice(
      $.context_annotation,
      $.isr_annotation,
      $.naked_annotation,
      $.section_annotation,
    ),

    context_annotation: $ => seq(
      '@',
      'context',
      '(',
      'thread',
      ')',
    ),

    // beemel's @isr arm parses an order-independent, possibly-empty list: the
    // string label and the `priority`/`tailchain` params are each optional and
    // may appear in any order (`@isr()`, `@isr("USART1")`, `@isr(priority=3,
    // "USART1")` all parse). Duplicate/ordering rules are semantic (E108), so the
    // grammar treats the label as just another comma-separated element.
    isr_annotation: $ => seq(
      '@',
      'isr',
      '(',
      commaSep($.isr_param),
      ')',
    ),

    isr_param: $ => choice(
      $.string_literal,
      seq('priority', '=', $.integer_literal),
      seq('tailchain', '=', choice($.boolean_literal, $.integer_literal)),
    ),

    naked_annotation: $ => seq('@', 'naked'),

    section_annotation: $ => seq('@', 'section', '(', $.string_literal, ')'),

    // ─── Module variable / constant definitions ──────────────────

    // A module-level `var` is access-controlled storage (takes @dma/@align/
    // @shared/@exclusive/@section). The node is named `static_definition` for
    // its storage class; the surface keyword is `var`.
    static_definition: $ => seq(
      optional('export'),
      'var',
      field('name', $.identifier),
      ':',
      field('type', $._type),
      repeat($._storage_annotation),
      optional(seq('in', field('region', $.identifier))),
      optional(seq('=', field('value', $._expression))),
      ';',
    ),

    const_definition: $ => seq(
      optional('export'),
      'const',
      field('name', $.identifier),
      ':',
      field('type', $._type),
      '=',
      field('value', $._expression),
      ';',
    ),

    _storage_annotation: $ => seq('@', choice(
      seq('exclusive', '(', $.identifier, ')'),
      // Bare `@shared` derives the ceiling from accessor contexts;
      // `@shared(ceiling = N)` pins it.
      seq('shared', optional(seq('(', 'ceiling', '=', $.integer_literal, ')'))),
      'dma',
      'external',
      seq('section', '(', $.string_literal, ')'),
      seq('align', '(', $.integer_literal, ')'),
    )),

    // `owns P, P.R;` -- a module's exclusive register-ownership claims.
    owns_statement: $ => seq(
      'owns',
      $.owns_path,
      repeat(seq(',', $.owns_path)),
      ';',
    ),

    owns_path: $ => choice(
      seq(
        field('peripheral', $.identifier),
        optional(seq('.', field('register', $.identifier))),
      ),
      // `owns gpio[lo..hi]` -- an exclusive GPIO-pin range.
      seq('gpio', '[', $.integer_literal, '..', $.integer_literal, ']'),
    ),

    // ─── comptime_assert ──────────────────────────────────────────

    comptime_assert: $ => seq(
      'comptime_assert',
      '(',
      field('condition', $._expression),
      ')',
      ';',
    ),

    // ─── Struct definition ────────────────────────────────────────

    struct_definition: $ => seq(
      optional('export'),
      'struct',
      field('name', $.identifier),
      optional($.repr_annotation),
      '{',
      commaSep($.struct_field),
      '}',
    ),

    repr_annotation: $ => seq('@', 'repr', '(', choice('C', 'packed'), ')'),

    struct_field: $ => seq(
      field('name', $.identifier),
      ':',
      field('type', $._type),
      repeat($.field_attribute),
    ),

    // `@be`/`@le` (byte order) and `@extent(addr_field [, xN] [, mask N])`:
    // transfer extent armed by this field, optionally scaled N bytes per count
    // unit (`xN`) and/or restricted to a sub-field bit mask (`mask N`), in that
    // fixed order. `mask` is a contextual keyword (a plain identifier elsewhere).
    field_attribute: $ => seq('@', choice(
      'be',
      'le',
      seq('extent', '(', $.identifier,
        optional(seq(',', $.extent_multiplier)),
        optional(seq(',', 'mask', $.integer_literal)),
        ')'),
    )),

    extent_multiplier: $ => token(/x[0-9]+/),

    // ─── Enum definition ──────────────────────────────────────────

    enum_definition: $ => seq(
      optional('export'),
      'enum',
      field('name', $.identifier),
      ':',
      field('underlying_type', $._type),
      '{',
      commaSep($.enum_variant_def),
      '}',
    ),

    enum_variant_def: $ => seq(
      field('name', $.identifier),
      optional(seq('=', $.integer_literal)),
    ),

    // ─── Peripheral definition ────────────────────────────────────

    // Anonymous form: `peripheral NAME at ADDR { reg ... }` (name + address +
    // inline layout). Unchanged by the peripheral_type feature.
    peripheral_definition: $ => seq(
      optional('export'),
      'peripheral',
      field('name', $.identifier),
      'at',
      $.integer_literal,
      '{',
      repeat($.register_definition),
      '}',
    ),

    // Register-layout template (no name binding, no address):
    // `peripheral_type NAME { reg ... }`. Instantiated by a peripheral_instance.
    // `export` is accepted here (beemel's parser consumes the token and recovers)
    // but is a compile error E108 -- a peripheral_type is never exportable, unlike
    // a peripheral_instance.
    peripheral_type_definition: $ => seq(
      optional('export'),
      'peripheral_type',
      field('name', $.identifier),
      '{',
      repeat($.register_definition),
      '}',
    ),

    // Instance of a peripheral_type, binding a name + address to a template:
    // `peripheral NAME: TYPE at ADDR;` (no body, trailing `;`).
    peripheral_instance: $ => seq(
      optional('export'),
      'peripheral',
      field('name', $.identifier),
      ':',
      field('type', $.named_type),
      'at',
      $.integer_literal,
      ';',
    ),

    register_definition: $ => seq(
      'reg',
      field('name', $.identifier),
      // Register array: `reg NAME[N] offset O stride S` -- N registers at
      // O, O+S, ..., reached as `P.NAME[i]`.
      optional(seq('[', field('count', $.integer_literal), ']')),
      'offset',
      $.integer_literal,
      optional(seq('stride', field('stride', $.integer_literal))),
      '{',
      repeat($.field_definition),
      '}',
    ),

    // A field carries its type either explicitly (`: TYPE` before the bit spec --
    // the full type grammar, mirroring beemel's parse_type_expr) or via an inline
    // `enum NAME { .. }` after the bit spec -- exactly one of the two (the compiler
    // rejects both/neither as E110/E111). An optional access modifier
    // (`readonly`/`writeonly`) follows. `prec.right` makes the trailing optionals
    // (inline enum / access) bind to this field instead of forcing an early reduce
    // -- needed because field_definition is also a top-level `_item` (for LSP
    // hover), which turns those trailing optionals into a shift/reduce ambiguity.
    field_definition: $ => prec.right(seq(
      'field',
      field('name', $.identifier),
      optional(seq(':', $._type)),
      'bit',
      '[',
      $.integer_literal,
      optional(seq('..', $.integer_literal)),
      ']',
      optional($.inline_field_enum),
      optional(field('access', $.access_modifier)),
    )),

    // Inline named field enum -- sugar for a top-level `export enum NAME` plus a
    // field typed by it. Has no `: underlying_type` (the backing type is
    // inferred from the largest discriminant).
    inline_field_enum: $ => seq(
      'enum',
      field('name', $.identifier),
      '{',
      commaSep($.enum_variant_def),
      '}',
    ),

    access_modifier: $ => choice('readonly', 'writeonly'),

    // ─── Imports ──────────────────────────────────────────────────
    // `export` is a declaration-site modifier on items (see each *_definition
    // rule above), not a statement. There is no selective-import form
    // (`import m { a, b };` is rejected by the compiler as E109).

    import_statement: $ => seq(
      'import',
      field('module', $.module_path),
      optional(seq('as', field('alias', $.identifier))),
      ';',
    ),

    module_path: $ => seq($.identifier, repeat(seq('.', $.identifier))),

    // ─── Statements ───────────────────────────────────────────────

    block: $ => seq(
      '{',
      repeat($._statement),
      optional($._expression),
      '}',
    ),

    _statement: $ => choice(
      $.variable_declaration,
      $.assignment_statement,
      $.expression_statement,
      $.if_statement,
      $.loop_statement,
      $.while_statement,
      $.for_statement,
      $.return_statement,
      $.break_statement,
      $.continue_statement,
      $.match_statement,
      $.claim_statement,
      $.asm_statement,
      $.assume_statement,
      $.assert_statement,
      $.block,
    ),

    // `claim X { ... }` -- a masked ownership window over a @shared static.
    claim_statement: $ => seq(
      'claim',
      field('target', $.identifier),
      field('body', $.block),
    ),

    variable_declaration: $ => seq(
      choice('var', 'const'),
      field('name', $.identifier),
      optional(seq(':', field('type', $._type))),
      '=',
      field('value', $._expression),
      ';',
    ),

    assignment_statement: $ => seq(
      field('left', $._lvalue),
      field('operator', $._assignment_operator),
      field('right', $._expression),
      ';',
    ),

    _assignment_operator: $ => choice(
      '=', '+=', '-=', '*=', '/=', '%=',
      '+%=', '-%=', '*%=',
      '&=', '|=', '^=', '<<=', '>>=',
    ),

    expression_statement: $ => seq($._expression, ';'),

    assume_statement: $ => seq('assume', '(', field('condition', $._expression), ')', ';'),
    assert_statement: $ => seq('assert', '(', field('condition', $._expression), ')', ';'),

    _lvalue: $ => choice(
      $.identifier,
      seq(field('object', $._lvalue), '.', field('field', $.identifier)),
      seq(field('object', $._lvalue), '[', field('index', $._expression), ']'),
      seq('*', field('target', $._expression)),
      // beemel parses the LHS as an expression then peels parens in
      // expr_to_lvalue, so a parenthesized place (`(*p).x = v`) stays assignable.
      seq('(', $._expression, ')'),
    ),

    if_statement: $ => seq(
      'if',
      field('condition', $._expression),
      field('consequence', $.block),
      optional(seq('else', field('alternative', choice($.block, $.if_statement)))),
    ),

    loop_statement: $ => seq('loop', field('body', $.block)),

    while_statement: $ => seq(
      'while',
      field('condition', $._expression),
      field('body', $.block),
    ),

    for_statement: $ => seq(
      'for',
      field('variable', $.identifier),
      ':',
      field('type', $._type),
      'in',
      field('start', $._expression),
      field('direction', choice('upto', 'downto')),
      field('end', $._expression),
      optional(seq('step', field('step', $._expression))),
      field('body', $.block),
    ),

    return_statement: $ => seq('return', optional(field('value', $._expression)), ';'),
    break_statement: $ => seq('break', ';'),
    continue_statement: $ => seq('continue', ';'),

    match_statement: $ => seq(
      'match',
      field('scrutinee', $._expression),
      '{',
      repeat($.match_arm),
      '}',
    ),

    // beemel eats an optional `,` after each arm body (parse_match_arms), so a
    // separating/trailing comma is allowed. Shared by match statement + expr.
    match_arm: $ => seq(
      pipeSep1($.match_pattern),
      field('body', $.block),
      optional(','),
    ),

    match_pattern: $ => choice(
      seq(field('type', $.identifier), '@', field('variant', $.identifier)),
      seq(field('start', $._pattern_integer), '..', field('end', $._pattern_integer)),
      field('value', $._pattern_integer),
      '_',
    ),

    _pattern_integer: $ => seq(optional('-'), $.integer_literal),

    asm_statement: $ => seq(
      'asm',
      $.asm_body,
      optional($.asm_sections),
      optional(';'),
    ),

    // asm_body (the balanced `{ ... }`) is an external token -- see src/scanner.c.

    asm_sections: $ => prec.right(seq(
      ':',
      optional($.asm_operands),
      optional(seq(
        ':',
        optional($.asm_operands),
        optional(seq(
          ':',
          optional($.asm_clobbers),
        )),
      )),
    )),

    asm_operands: $ => seq($.asm_operand, repeat(seq(',', $.asm_operand))),

    asm_operand: $ => seq(
      field('constraint', $.string_literal),
      '(',
      field('value', $._expression),
      ')',
    ),

    asm_clobbers: $ => seq($.string_literal, repeat(seq(',', $.string_literal))),

    // ─── Expressions (Pratt parser style) ────────────────────────

    // Assignment is statement-only in BML; there is no assignment expression.
    _expression: $ => choice(
      $.cast_expression,
      $.enum_variant_expression,
      $.sizeof_expression,
      $.binary_expression,
      $.comparison_expression,
      $.equality_expression,
      $.logical_and_expression,
      $.logical_or_expression,
      $.unary_expression,
      $.addr_of_mut_expression,
      $.call_expression,
      $.field_expression,
      $.index_expression,
      $._primary_expression,
    ),

    cast_expression: $ => prec.left(PREC.AS_CAST, seq(
      field('value', $._expression),
      'as',
      field('type', $._type),
    )),

    enum_variant_expression: $ => prec.left(PREC.ENUM_VARIANT, seq(
      field('enum_name', $._expression),
      '@',
      field('variant', $.identifier),
    )),

    sizeof_expression: $ => prec(PREC.UNARY, seq(
      'sizeof',
      '(',
      field('type', $._type),
      ')',
    )),

    binary_expression: $ => {
      const table = [
        [PREC.MULTIPLICATIVE, '*'],
        [PREC.MULTIPLICATIVE, '/'],
        [PREC.MULTIPLICATIVE, '%'],
        [PREC.MULTIPLICATIVE, '*%'],
        [PREC.ADDITIVE, '+'],
        [PREC.ADDITIVE, '-'],
        [PREC.ADDITIVE, '+%'],
        [PREC.ADDITIVE, '-%'],
        [PREC.SHIFT, '<<'],
        [PREC.SHIFT, '>>'],
        [PREC.BITWISE, '&'],
        [PREC.BITWISE, '|'],
        [PREC.BITWISE, '^'],
      ];
      return choice(...table.map(([precedence, operator]) =>
        prec.left(precedence, seq(
          field('left', $._expression),
          operator,
          field('right', $._expression),
        ))
      ));
    },

    comparison_expression: $ => prec.left(PREC.COMPARISON, seq(
      field('left', $._expression),
      choice('<', '>', '<=', '>='),
      field('right', $._expression),
    )),

    equality_expression: $ => prec.left(PREC.EQUALITY, seq(
      field('left', $._expression),
      choice('==', '!='),
      field('right', $._expression),
    )),

    logical_and_expression: $ => prec.left(PREC.LOGICAL_AND, seq(
      field('left', $._expression),
      '&&',
      field('right', $._expression),
    )),

    logical_or_expression: $ => prec.left(PREC.LOGICAL_OR, seq(
      field('left', $._expression),
      '||',
      field('right', $._expression),
    )),

    unary_expression: $ => prec(PREC.UNARY, seq(
      field('operator', choice('-', '!', '~', '*', '&')),
      field('argument', $._expression),
    )),

    addr_of_mut_expression: $ => prec(PREC.UNARY, seq(
      '&',
      'mut',
      field('argument', $._expression),
    )),

    call_expression: $ => prec(PREC.CALL, seq(
      field('function', $._expression),
      field('arguments', $.argument_list),
    )),

    field_expression: $ => prec(PREC.FIELD_ACCESS, seq(
      field('object', $._expression),
      '.',
      field('field', $.identifier),
    )),

    index_expression: $ => prec(PREC.FIELD_ACCESS, seq(
      field('object', $._expression),
      '[',
      field('index', $._expression),
      ']',
    )),

    argument_list: $ => seq(
      '(',
      commaSep($._expression),
      ')',
    ),

    _primary_expression: $ => choice(
      $.identifier,
      $.integer_literal,
      $.float_literal,
      $.boolean_literal,
      $.string_literal,
      $.null_literal,
      $.array_expression,
      $.struct_expression,
      $.group_expression,
      $.block_expression,
      $.if_expression,
      $.match_expression,
      $.view_expression,
      $.reclaim_expression,
      $.ring_expression,
      $.bits_expression,
    ),

    array_expression: $ => seq(
      '[',
      commaSep($._expression),
      ']',
    ),

    // The struct name may be module-qualified (`mod.Point { .. }`) -- beemel's
    // postfix `{` arm fires when the base is a qualified_name (one dot).
    struct_expression: $ => seq(
      field('name', seq($.identifier, optional(seq('.', $.identifier)))),
      '{',
      commaSep($.struct_field_init),
      '}',
    ),

    struct_field_init: $ => seq(
      field('name', $.identifier),
      ':',
      field('value', $._expression),
    ),

    group_expression: $ => seq('(', $._expression, ')'),

    block_expression: $ => $.block,

    if_expression: $ => seq(
      'if',
      field('condition', $._expression),
      field('consequence', $.block),
      'else',
      field('alternative', choice($.block, $.if_expression)),
    ),

    match_expression: $ => seq(
      'match',
      field('scrutinee', $._expression),
      '{',
      repeat($.match_arm),
      '}',
    ),

    // view(arr) | view(arr, stride K) | view(ptr, len)
    view_expression: $ => seq(
      'view',
      '(',
      field('backing', $._expression),
      optional(seq(',', choice(
        seq('stride', field('stride', $._expression)),
        field('length', $._expression),
      ))),
      ')',
    ),

    // reclaim(arr): the handshake-acknowledged view over agent-shared
    // memory. Contiguous form only -- no len/stride.
    reclaim_expression: $ => seq(
      'reclaim',
      '(',
      field('backing', $._expression),
      ')',
    ),

    // ring(arr, head, len) | ring(ptr, capacity, head, len)
    ring_expression: $ => seq(
      'ring',
      '(',
      commaSep1($._expression),
      ')',
    ),

    // bits(arr) | bits(ptr, bit_offset, len_bits)
    bits_expression: $ => seq(
      'bits',
      '(',
      field('backing', $._expression),
      optional(seq(',', $._expression, ',', $._expression)),
      ')',
    ),

    // ─── Types ────────────────────────────────────────────────────

    _type: $ => choice(
      $.named_type,
      $.pointer_type,
      $.mutable_pointer_type,
      $.array_type,
      $.function_pointer_type,
      $.view_type,
      $.ring_type,
      $.bits_type,
      $.addr_type,
    ),

    // `addr in <region>`: an in-memory handoff slot (descriptor field).
    addr_type: $ => seq('addr', 'in', field('region', $.identifier)),

    // A type name, optionally module-qualified (`module.Type`) for an imported
    // type referenced via its import name or alias. beemel stores this as the
    // single dotted string `"module.Type"` -- exactly one dot
    // (parse_type_expr_inner). `prec.right` so the dot binds into the type name
    // (e.g. `x as mod.T`) rather than splitting as `(x as mod).T`, matching
    // beemel's greedy parse_type_expr.
    named_type: $ => prec.right(seq($.identifier, optional(seq('.', $.identifier)))),

    pointer_type: $ => prec.left(seq('*', $._type)),

    mutable_pointer_type: $ => prec.left(seq('*', 'mut', $._type)),

    array_type: $ => seq(
      '[',
      field('element_type', $._type),
      ';',
      field('length', $._expression),
      ']',
    ),

    view_type: $ => prec.right(seq(
      'view',
      optional('mut'),
      field('element_type', $._type),
      optional(seq('stride', field('stride', $._expression))),
    )),

    ring_type: $ => prec.right(seq(
      'ring',
      optional('mut'),
      field('element_type', $._type),
    )),

    bits_type: $ => seq(
      'bits',
      optional('mut'),
    ),

    function_pointer_type: $ => seq(
      'fn',
      field('parameters', $.type_parameter_list),
      optional(field('return_type', seq('->', $._type))),
    ),

    type_parameter_list: $ => seq(
      '(',
      commaSep($._type),
      ')',
    ),

    // ─── Literals ─────────────────────────────────────────────────

    // beemel: ASCII-only start (`[a-zA-Z_]`, lexer.rs:657) but a Unicode
    // continuation (`is_alphanumeric()`, read_ident_range) -- so `caféVar`
    // is a valid identifier while a non-ASCII first char is not.
    identifier: $ => /[a-zA-Z_][\p{L}\p{N}_]*/u,

    integer_literal: $ => {
      const suffix = '(i8|i16|i32|i64|u8|u16|u32|u64)';
      return token(new RegExp(`0[xX][0-9a-fA-F_]+${suffix}?|[0-9][0-9_]*${suffix}?`));
    },

    // digits with a fractional part and/or an exponent, then optional h/f/d suffix.
    float_literal: $ => /[0-9][0-9_]*(\.[0-9][0-9_]*([eE][+-]?[0-9][0-9_]*)?|[eE][+-]?[0-9][0-9_]*)[hfd]?/,

    boolean_literal: $ => choice('true', 'false'),

    // beemel's read_string pushes any byte except `"`/`\` into the body, raw
    // newlines included -- so the content run must not exclude `\n`.
    string_literal: $ => seq(
      '"',
      repeat(choice(
        token.immediate(prec(1, /[^"\\]+/)),
        $.escape_sequence,
      )),
      '"',
    ),

    escape_sequence: $ => token(seq('\\', /[ntr\\\"0]/)),

    null_literal: $ => 'null',

    // ─── Comments ─────────────────────────────────────────────────

    line_comment: $ => token(seq('//', /.*/)),

    // block_comment is an external token (src/scanner.c) so it can nest.
  },
});

/**
 * @param {RuleOrLiteral} rule
 */
function commaSep(rule) {
  return optional(commaSep1(rule));
}

/**
 * @param {RuleOrLiteral} rule
 */
function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)), optional(','));
}

/**
 * @param {RuleOrLiteral} rule
 */
function pipeSep1(rule) {
  return seq(rule, repeat(seq('|', rule)));
}
