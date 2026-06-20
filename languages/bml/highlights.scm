; ─── Keywords ─────────────────────────────────────────────────────
[
  "fn"
  "extern"
  "var"
  "const"
  "peripheral"
  "peripheral_type"
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
  "pio"
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
  "align"
  "naked"
  "tailchain"
  "upto"
  "downto"
  "step"
  "stride"
  "owns"
  "gpio"
  "claim"
  "reclaim"
  "repr"
  "be"
  "le"
  "extent"
  "addr"
  "assume"
  "assert"
  "comptime_assert"
] @keyword

; ─── Storage modifier keywords ────────────────────────────────────
[
  "var"
  "const"
] @keyword.storage

; ─── Type keywords ────────────────────────────────────────────────
[
  "struct"
  "enum"
  "peripheral"
  "peripheral_type"
  "view"
  "ring"
  "bits"
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
  "align"
  "naked"
  "tailchain"
  "repr"
  "be"
  "le"
  "extent"
  "mask"
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

; Struct / enum name definitions
; (peripheral / peripheral_type / instance names are in the Peripherals section)
(struct_definition name: (identifier) @type)
(enum_definition name: (identifier) @type)

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

; Builtin functions
((call_expression
  function: (identifier) @function.builtin)
  (#eq? @function.builtin "len"))

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

; `peripheral_type NAME { .. }` -- the register-layout template
(peripheral_type_definition
  name: (identifier) @type)

; `peripheral NAME: TYPE at ADDR;` -- an instance of a peripheral_type
; (the `type:` named_type is already covered by the (named_type) @type rule)
(peripheral_instance
  name: (identifier) @type)

(register_definition
  name: (identifier) @property)

(field_definition
  name: (identifier) @variable.member)

; Field access modifier: `readonly` / `writeonly`
(access_modifier) @keyword.modifier

; Inline named field enum: `field F bit[..] enum NAME { .. }`
(inline_field_enum
  name: (identifier) @type)

(owns_path
  peripheral: (identifier) @type)

(owns_path
  register: (identifier) @property)

; ─── Modules / imports ────────────────────────────────────────────
(import_statement
  module: (module_path (identifier) @module))

(import_statement
  alias: (identifier) @module)

; ─── Literals ─────────────────────────────────────────────────────
(integer_literal) @number
(float_literal) @number.float
(extent_multiplier) @number
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
  "+%"
  "-%"
  "*%"
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
  "+="
  "-="
  "*="
  "/="
  "%="
  "+%="
  "-%="
  "*%="
  "&="
  "|="
  "^="
  "<<="
  ">>="
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
