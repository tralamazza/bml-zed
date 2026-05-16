//! Tree-sitter grammar for the BML language.

use tree_sitter::Language;

extern "C" {
    fn tree_sitter_bml() -> Language;
}

/// Returns the tree-sitter [Language] for BML.
pub fn language() -> Language {
    unsafe { tree_sitter_bml() }
}

/// Returns the tree-sitter [Language] for BML (alternate name).
pub const fn language_bml() -> Language {
    unsafe { tree_sitter_bml() }
}

#[cfg(test)]
mod tests {
    use tree_sitter::Parser;

    #[test]
    fn test_parse_empty() {
        let mut parser = Parser::new();
        parser.set_language(&super::language()).unwrap();
        let tree = parser.parse("", None).unwrap();
        let root = tree.root_node();
        assert_eq!(root.kind(), "source_file");
    }
}
