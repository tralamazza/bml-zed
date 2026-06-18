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

; Peripheral-type templates and their instances
(peripheral_type_definition
  name: (identifier) @name) @item

(peripheral_instance
  name: (identifier) @name) @item

; Import statements
(import_statement
  module: (module_path) @name) @item

; Register definitions (inside peripherals)
(register_definition
  name: (identifier) @name) @item
