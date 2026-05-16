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
  ASSIGNMENT: 20,
};

module.exports = grammar({
  name: 'bml',

  extras: $ => [
    $.line_comment,
    $.block_comment,
    /\s/,
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
      $.import_statement,
      $.export_statement,
    ),

    // ─── Function definitions ─────────────────────────────────────

    function_definition: $ => seq(
      'fn',
      field('name', $.identifier),
      field('parameters', $.parameter_list),
      optional(field('return_type', $.return_type)),
      optional($.function_annotation),
      field('body', $.block),
    ),

    extern_function_declaration: $ => seq(
      'extern',
      'fn',
      field('name', $.identifier),
      field('parameters', $.parameter_list),
      optional(field('return_type', $.return_type)),
      optional($.function_annotation),
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
    ),

    context_annotation: $ => seq(
      '@',
      'context',
      '(',
      'thread',
      ')',
    ),

    isr_annotation: $ => seq(
      '@',
      'isr',
      '(',
      optional(seq($.string_literal, ',')),
      'priority',
      '=',
      $.integer_literal,
      ')',
    ),

    // ─── Variable / constant / static definitions ────────────────

    static_definition: $ => seq(
      'static',
      field('name', $.identifier),
      ':',
      field('type', $._type),
      repeat($._storage_annotation),
      optional(seq('=', field('value', $._expression))),
      ';',
    ),

    const_definition: $ => seq(
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
      seq('shared', '(', 'ceiling', '=', $.integer_literal, ')'),
      'dma',
      'external',
      seq('section', '(', $.string_literal, ')'),
    )),

    // ─── Struct definition ────────────────────────────────────────

    struct_definition: $ => seq(
      'struct',
      field('name', $.identifier),
      '{',
      commaSep($.struct_field),
      '}',
    ),

    struct_field: $ => seq(
      field('name', $.identifier),
      ':',
      field('type', $._type),
    ),

    // ─── Enum definition ──────────────────────────────────────────

    enum_definition: $ => seq(
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

    peripheral_definition: $ => seq(
      'peripheral',
      field('name', $.identifier),
      'at',
      $.integer_literal,
      '{',
      repeat($.register_definition),
      '}',
    ),

    register_definition: $ => seq(
      'reg',
      field('name', $.identifier),
      'offset',
      $.integer_literal,
      '{',
      repeat($.field_definition),
      '}',
    ),

    field_definition: $ => seq(
      'field',
      field('name', $.identifier),
      ':',
      choice(
        seq('bit', '[', $.integer_literal, ']'),
        seq('bits', '[', $.integer_literal, '..', $.integer_literal, ']'),
      ),
    ),

    // ─── Import / Export ──────────────────────────────────────────

    import_statement: $ => seq(
      'import',
      field('module', $.identifier),
      optional($.import_items),
      optional(seq('as', field('alias', $.identifier))),
      ';',
    ),

    import_items: $ => seq('{', commaSep($.identifier), '}'),

    export_statement: $ => seq(
      'export',
      choice('fn', 'static', 'const', 'peripheral', 'struct', 'enum'),
      commaSep1($.identifier),
      ';',
    ),

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
      $.asm_statement,
      $.block,
    ),

    variable_declaration: $ => seq(
      choice('var', 'val'),
      field('name', $.identifier),
      optional(seq(':', field('type', $._type))),
      '=',
      field('value', $._expression),
      ';',
    ),

    assignment_statement: $ => seq(
      field('left', $._lvalue),
      '=',
      field('right', $._expression),
      ';',
    ),

    expression_statement: $ => seq($._expression, ';'),

    _lvalue: $ => choice(
      $.identifier,
      seq(field('object', $._lvalue), '.', field('field', $.identifier)),
      seq(field('object', $._lvalue), '[', field('index', $._expression), ']'),
      seq('*', field('target', $._expression)),
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
      'in',
      field('start', $._expression),
      '..',
      field('end', $._expression),
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

    match_arm: $ => seq(
      pipeSep1($.match_pattern),
      field('body', $.block),
    ),

    match_pattern: $ => choice(
      seq(field('type', $.identifier), '@', field('variant', $.identifier)),
      '_',
    ),

    asm_statement: $ => seq('asm', $.asm_body),

    asm_body: $ => seq('{', /[^}]*/, '}'),

    // ─── Expressions (Pratt parser style) ────────────────────────

    _expression: $ => choice(
      $.assignment_expression,
      $._expr_without_assign,
    ),

    assignment_expression: $ => prec(PREC.ASSIGNMENT, seq(
      field('left', $._lvalue),
      '=',
      field('right', $._expression),
    )),

    _expr_without_assign: $ => choice(
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
        [PREC.ADDITIVE, '+'],
        [PREC.ADDITIVE, '-'],
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
    ),

    array_expression: $ => seq(
      '[',
      commaSep($._expression),
      ']',
    ),

    struct_expression: $ => seq(
      field('name', $.identifier),
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

    // ─── Types ────────────────────────────────────────────────────

    _type: $ => choice(
      $.named_type,
      $.pointer_type,
      $.mutable_pointer_type,
      $.array_type,
      $.function_pointer_type,
    ),

    named_type: $ => $.identifier,

    pointer_type: $ => prec.left(seq('*', $._type)),

    mutable_pointer_type: $ => prec.left(seq('*', 'mut', $._type)),

    array_type: $ => seq(
      '[',
      field('element_type', $._type),
      ';',
      field('length', $._expression),
      ']',
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

    identifier: $ => /[a-zA-Z_][a-zA-Z0-9_]*/,

    integer_literal: $ => {
      const suffix = '(i8|i16|i32|i64|u8|u16|u32|u64)';
      return token(new RegExp(`0[xX][0-9a-fA-F_]+${suffix}?|[0-9][0-9_]*${suffix}?`));
    },

    float_literal: $ => /[0-9][0-9_]*\.[0-9][0-9_]*[hfdHFD]?/,

    boolean_literal: $ => choice('true', 'false'),

    string_literal: $ => seq(
      '"',
      repeat(choice(
        token.immediate(prec(1, /[^"\\\n]+/)),
        $.escape_sequence,
      )),
      '"',
    ),

    escape_sequence: $ => token(seq('\\', /[ntr\\\"0]/)),

    null_literal: $ => 'null',

    // ─── Comments ─────────────────────────────────────────────────

    line_comment: $ => token(seq('//', /.*/)),

    block_comment: $ => token(seq(
      '/*',
      /[^*]*\*+([^/*][^*]*\*+)*/,
      '/',
    )),
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
