; Indentation rules for BML

; Indent after opening brace
(block "}" @end) @indent

; Indent struct body
(struct_definition "}" @end) @indent

; Indent enum body
(enum_definition "}" @end) @indent

; Indent peripheral body
(peripheral_definition "}" @end) @indent

; Indent peripheral_type body
(peripheral_type_definition "}" @end) @indent

; Indent register body
(register_definition "}" @end) @indent

; Indent inline field enum body
(inline_field_enum "}" @end) @indent

; Indent field definition body (not needed, handled by register)

; Indent match body
(match_statement "}" @end) @indent
(match_expression "}" @end) @indent

; Indent array expressions
(array_expression "]" @end) @indent

; Indent struct expressions
(struct_expression "}" @end) @indent

; Indent parameter lists
(parameter_list ")" @end) @indent

; Indent argument lists
(argument_list ")" @end) @indent
