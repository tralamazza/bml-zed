; Text objects for BML (Vim mode)

; Function as a text object
(function_definition
  body: (_) @function.inside) @function.around

; Block as inner function body (for blocks used as expressions)
(block (_) @function.inside) @function.around

; Extern function declarations
(extern_function_declaration) @function.around

; Struct definition as class
(struct_definition
  body: (_) @class.inside) @class.around

; Enum definition as class
(enum_definition) @class.around

; Peripheral definition as class
(peripheral_definition) @class.around

; Comments
(line_comment)+ @comment.around
(block_comment) @comment.around
