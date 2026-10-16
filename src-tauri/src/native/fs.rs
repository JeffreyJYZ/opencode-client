//! The plugin filesystem, scoped to `plugin-data/<id>/` (M4.16).
//!
//! `native`'s `NativeFs` port (`src/plugins/services/native.ts`) is the app's
//! filesystem; this is the shell's half of it. Every path the page sends must be
//! absolute and below `<app data dir>/plugin-data/<id>/`, where `<id>` is the one
//! path component it carries and `safe_id` is the allowlist that guards it. A path
//! outside the plugin's own directory — a parent segment, an absolute path that is
//! not under `plugin-data`, or a symlink whose target leaves the directory — is
//! refused, and a refusal is a logged `[shell]` line rather than a throw.

use std::path::{Component, Path, PathBuf};

/// The directory a plugin's own files live under, below the app's data root.
/// Kept in step with `PLUGIN_DATA_DIR` in `src/constants/plugins.ts`.
pub const DATA_DIR: &str = "plugin-data";

pub mod commands;

#[cfg(test)]
mod tests;

/// The plugin's own data directory for `path`, or a refusal.
///
/// `path` must be absolute and below `<root>/plugin-data/`; the first component
/// below that is the plugin id, which must pass `safe_id`, and no later component
/// may climb (`..`). The returned directory is where the scope ends.
pub fn scoped(root: &Path, path: &Path) -> Result<PathBuf, String> {
    let plugin_data = root.join(DATA_DIR);
    let rest = path
        .strip_prefix(&plugin_data)
        .map_err(|_| format!("{} is not below {DATA_DIR}", path.display()))?;
    let mut parts = rest.components();
    let id = match parts.next() {
        Some(Component::Normal(name)) => name.to_string_lossy().into_owned(),
        _ => {
            return Err(format!(
                "{} names no plugin below {DATA_DIR}",
                path.display()
            ));
        }
    };
    if !crate::safe_id(&id) {
        return Err(format!("{id:?} is not a safe plugin id"));
    }
    for part in parts {
        if !matches!(part, Component::Normal(_)) {
            return Err(format!(
                "{} climbs out with {:?}",
                path.display(),
                part.as_os_str()
            ));
        }
    }
    Ok(plugin_data.join(id))
}

/// Whether `target`, once every symlink is resolved, is `dir` itself or below it.
fn inside(dir: &Path, target: &Path) -> Result<(), String> {
    let real_dir = dir
        .canonicalize()
        .map_err(|error| format!("{} is not there ({error})", dir.display()))?;
    let real = target
        .canonicalize()
        .map_err(|error| format!("{} is not there ({error})", target.display()))?;
    if real == real_dir || real.starts_with(&real_dir) {
        Ok(())
    } else {
        Err(format!(
            "{} resolves outside the plugin's own data directory",
            target.display()
        ))
    }
}

/// The file at `path`, or a refusal when it is outside the plugin's directory.
pub fn read_text(root: &Path, path: &Path) -> Result<String, String> {
    let dir = scoped(root, path)?;
    inside(&dir, path)?;
    std::fs::read_to_string(path).map_err(|error| error.to_string())
}

/// Write `value` to `path`; its parent must already be inside the directory.
pub fn write_text(root: &Path, path: &Path, value: &str) -> Result<(), String> {
    let dir = scoped(root, path)?;
    inside(&dir, path.parent().unwrap_or(path))?;
    std::fs::write(path, value).map_err(|error| error.to_string())
}

/// The names directly inside `path`, or a refusal when it is outside.
pub fn list(root: &Path, path: &Path) -> Result<Vec<String>, String> {
    let dir = scoped(root, path)?;
    inside(&dir, path)?;
    let mut names = Vec::new();
    for entry in std::fs::read_dir(path).map_err(|error| error.to_string())? {
        let name = entry.map_err(|error| error.to_string())?.file_name();
        names.push(name.to_string_lossy().into_owned());
    }
    Ok(names)
}

/// Remove `path` — a file, or a directory and everything below it.
pub fn remove(root: &Path, path: &Path) -> Result<(), String> {
    let dir = scoped(root, path)?;
    inside(&dir, path)?;
    let meta = std::fs::symlink_metadata(path).map_err(|error| error.to_string())?;
    if meta.is_dir() {
        std::fs::remove_dir_all(path).map_err(|error| error.to_string())
    } else {
        std::fs::remove_file(path).map_err(|error| error.to_string())
    }
}

/// The real path of `path` — every symlink resolved.
///
/// Allowed to leave the directory on purpose: this is what lets the service see an
/// escape and refuse it with its own reason, rather than the shell's.
pub fn real_path(root: &Path, path: &Path) -> Result<String, String> {
    scoped(root, path)?;
    Ok(path
        .canonicalize()
        .map_err(|error| error.to_string())?
        .to_string_lossy()
        .into_owned())
}

/// Create `path` and every missing parent, then prove it landed inside the scope.
pub fn make_dir(root: &Path, path: &Path) -> Result<(), String> {
    let dir = scoped(root, path)?;
    std::fs::create_dir_all(path).map_err(|error| error.to_string())?;
    inside(&dir, path)
}
