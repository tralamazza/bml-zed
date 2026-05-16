use std::fs;
use std::path::PathBuf;
use zed_extension_api::{self as zed, serde_json, settings::LspSettings, LanguageServerId, Result};

struct BmlExtension {
    cached_binary_path: Option<String>,
}

impl BmlExtension {
    fn lsp_binary(
        &mut self,
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

        if let Some(path) = &self.cached_binary_path {
            if fs::metadata(path).is_ok_and(|stat| stat.is_file()) {
                return Ok((path.clone(), args));
            }
        }

        // Look for pre-built binary nearby
        let bml_dir = std::path::Path::new(&worktree.root_path())
            .parent()
            .map(|p| p.join("bml"))
            .unwrap_or_else(|| PathBuf::from("../bml"));

        // Check if bml-lsp binary already exists
        for profile in ["release", "debug"] {
            let candidate = bml_dir.join("target").join(profile).join("bml-lsp");
            if candidate.exists() {
                self.cached_binary_path = Some(candidate.to_string_lossy().to_string());
                return Ok((candidate.to_string_lossy().to_string(), args));
            }
        }

        // Not found; report status
        zed::set_language_server_installation_status(
            language_server_id,
            &zed::LanguageServerInstallationStatus::CheckingForUpdate,
        );

        Err(format!(
            "bml-lsp not found. Build it with: cd {} && cargo build --bin bml-lsp",
            bml_dir.display()
        ))
    }
}

impl zed::Extension for BmlExtension {
    fn new() -> Self {
        Self {
            cached_binary_path: None,
        }
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
