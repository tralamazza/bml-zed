; Code outline for BML

; Function definitions
(function_definition
  name: (identifier) @name) @item

(extern_function_declaration
  name: (identifier) @name) @item

; Static definitions
(static_definition
  name: (identifier) @name) @item

; Const definitions
(const_definition
  name: (identifier) @name) @item

; Struct definitions
(struct_definition
  name: (identifier) @name) @item

; Enum definitions
(enum_definition
  name: (identifier) @name) @item

; Peripheral definitions
(peripheral_definition
  name: (identifier) @name) @item

; Import statements
(import_statement
  module: (identifier) @name) @item

; Register definitions (inside peripherals)
(register_definition
  name: (identifier) @name) @item
