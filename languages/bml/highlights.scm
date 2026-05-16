; ─── Keywords ─────────────────────────────────────────────────────
[
  "fn"
  "extern"
  "var"
  "val"
  "static"
  "const"
  "peripheral"
  "reg"
  "field"
  "at"
  "offset"
  "bit"
  "as"
  "if"
  "else"
  "loop"
  "while"
  "for"
  "in"
  "return"
  "break"
  "continue"
  "import"
  "export"
  "struct"
  "enum"
  "sizeof"
  "match"
  "mut"
  "true"
  "false"
  "asm"
  "context"
  "thread"
  "isr"
  "priority"
  "dma"
  "external"
  "shared"
  "exclusive"
  "ceiling"
  "section"
] @keyword

; ─── Storage modifier keywords ────────────────────────────────────
[
  "var"
  "val"
  "static"
  "const"
] @keyword.storage

; ─── Type keywords ────────────────────────────────────────────────
[
  "struct"
  "enum"
  "peripheral"
] @keyword.type

; ─── Conditional keywords ─────────────────────────────────────────
[
  "if"
  "else"
  "match"
] @keyword.conditional

; ─── Repeat keywords ──────────────────────────────────────────────
[
  "loop"
  "while"
  "for"
  "break"
  "continue"
] @keyword.repeat

; ─── Return ───────────────────────────────────────────────────────
"return" @keyword.return

; ─── Import/export ────────────────────────────────────────────────
[
  "import"
  "export"
] @keyword.import

; ─── Annotation keywords ──────────────────────────────────────────
[
  "context"
  "thread"
  "isr"
  "priority"
  "dma"
  "external"
  "shared"
  "exclusive"
  "ceiling"
  "section"
] @attribute

; ─── Types ────────────────────────────────────────────────────────
; Named types and built-in type identifiers
((identifier) @type.builtin
  (#any-of? @type.builtin
    "i8" "i16" "i32" "i64"
    "u8" "u16" "u32" "u64"
    "f16" "f32" "f64"
    "b1" "b8"
    "void"
  ))

; Struct / enum / peripheral name definitions
(struct_definition name: (identifier) @type)
(enum_definition name: (identifier) @type)
(peripheral_definition name: (identifier) @type)

; Type annotations - named types used as type references
(named_type) @type

; Enum variant type prefix
(enum_variant_expression
  enum_name: (identifier) @type)

; ─── Functions ────────────────────────────────────────────────────
(function_definition
  name: (identifier) @function)

(extern_function_declaration
  name: (identifier) @function)

(call_expression
  function: (identifier) @function.call)

(call_expression
  function: (field_expression
    field: (identifier) @function.call))

; ─── Function parameters ──────────────────────────────────────────
(parameter
  name: (identifier) @variable.parameter)

(parameter_list
  (parameter
    name: (identifier) @variable.parameter))

; ─── Variables ────────────────────────────────────────────────────
(variable_declaration
  name: (identifier) @variable)

(for_statement
  variable: (identifier) @variable)

; ─── Constants ────────────────────────────────────────────────────
(const_definition
  name: (identifier) @constant)

(static_definition
  name: (identifier) @constant)

; ─── Fields ───────────────────────────────────────────────────────
(struct_field
  name: (identifier) @property)

(struct_field_init
  name: (identifier) @property)

(field_expression
  field: (identifier) @property)

; ─── Enum variants ────────────────────────────────────────────────
(enum_variant_def
  name: (identifier) @enumMember)

(enum_variant_expression
  variant: (identifier) @enumMember)

; ─── Match pattern ────────────────────────────────────────────────
(match_pattern
  variant: (identifier) @enumMember)

; ─── Peripherals / registers / fields ─────────────────────────────
(peripheral_definition
  name: (identifier) @type)

(register_definition
  name: (identifier) @property)

(field_definition
  name: (identifier) @variable.member)

; ─── Modules / imports ────────────────────────────────────────────
(import_statement
  module: (identifier) @module)

(import_statement
  alias: (identifier) @module)

; ─── Literals ─────────────────────────────────────────────────────
(integer_literal) @number
(float_literal) @number.float
(boolean_literal) @boolean
(null_literal) @constant.builtin
(string_literal) @string
(escape_sequence) @string.escape

; ─── Operators ────────────────────────────────────────────────────
[
  "+"
  "-"
  "*"
  "/"
  "%"
  "=="
  "!="
  "<"
  ">"
  "<="
  ">="
  "&&"
  "||"
  "&"
  "|"
  "^"
  "~"
  "<<"
  ">>"
  "="
  "!"
  "->"
  ".."
  "@"
] @operator

; ─── Punctuation ──────────────────────────────────────────────────
[
  "("
  ")"
  "{"
  "}"
  "["
  "]"
] @punctuation.bracket

[
  ";"
  "."
  ","
  ":"
] @punctuation.delimiter

; ─── Comments ─────────────────────────────────────────────────────
(line_comment) @comment
(block_comment) @comment

; ─── Labels (function annotations) ────────────────────────────────
(function_annotation) @label

; ─── Special identifiers ──────────────────────────────────────────
((identifier) @variable.builtin
  (#eq? @variable.builtin "_"))

; Highlight uppercase identifiers as constants (convention)
((identifier) @constant
  (#match? @constant "^[A-Z][A-Z_0-9]+$"))
