use zed_extension_api::{self as zed, serde_json, settings::LspSettings, LanguageServerId, Result};

struct BmlExtension;

impl BmlExtension {
    fn lsp_binary(
        &self,
        language_server_id: &LanguageServerId,
        worktree: &zed::Worktree,
    ) -> Result<(String, Option<Vec<String>>)> {
        let mut args: Option<Vec<String>> = None;

        if let Ok(lsp_settings) = LspSettings::for_worktree(language_server_id.as_ref(), worktree) {
            if let Some(binary) = lsp_settings.binary {
                args = binary.arguments;
                if let Some(path) = binary.path {
                    return Ok((path, args));
                }
            }
        }

        if let Some(path) = worktree.which("bml-lsp") {
            return Ok((path, args));
        }

        Err("bml-lsp not found. Add it to your PATH, or set \
             lsp.bml-lsp.binary.path in your Zed settings."
            .to_string())
    }
}

impl zed::Extension for BmlExtension {
    fn new() -> Self {
        Self
    }

    fn language_server_command(
        &mut self,
        language_server_id: &LanguageServerId,
        worktree: &zed::Worktree,
    ) -> Result<zed::Command> {
        let (path, args) = self.lsp_binary(language_server_id, worktree)?;
        Ok(zed::Command {
            command: path,
            args: args.unwrap_or_default(),
            env: worktree.shell_env(),
        })
    }

    fn language_server_workspace_configuration(
        &mut self,
        _language_server_id: &LanguageServerId,
        worktree: &zed::Worktree,
    ) -> Result<Option<serde_json::Value>> {
        let settings = LspSettings::for_worktree("bml-lsp", worktree)
            .ok()
            .and_then(|lsp_settings| lsp_settings.settings.clone())
            .unwrap_or_default();
        Ok(Some(settings))
    }
}

zed::register_extension!(BmlExtension);
