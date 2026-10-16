//! Opening a file at a line in the machine's editor (M5.2).

use std::process::Command;

/// The editor the shell opens a file in, by name on `PATH`.
///
/// **Kept in step with `DEFAULT_EDITOR` in `src/constants/native.ts`.** Zed is this
/// machine's editor; the constant is the one place the choice is written, so
/// changing editors is a change here and nowhere else.
pub const EDITOR_DEFAULT: &str = "zed";

/// Whether `path` is a file the editor may be asked to open, at `line`.
///
/// A **path**, never a command line: it must be absolute, carry no NUL, and name a
/// positive line. The path travels to the editor as one element of an **argument
/// array**, so a space, a quote or a `;` inside it can never become shell syntax —
/// the guard is about refusing a non-path, not about escaping a string.
pub fn is_editor_target(path: &str, line: u32) -> bool {
    path.starts_with('/') && !path.contains('\0') && line > 0
}

/// Spawn the editor on `path:line` (`zed`'s own syntax is `path:line:column`).
///
/// The child is reaped on a detached thread rather than waited for: the app must
/// not block on an editor it does not own, and a dropped `Child` would otherwise
/// stay a zombie until the shell exits.
pub fn spawn(path: &str, line: u32) -> std::io::Result<()> {
    let mut child = Command::new(EDITOR_DEFAULT)
        .arg(format!("{path}:{line}"))
        .spawn()?;
    std::thread::spawn(move || {
        let _ = child.wait();
    });
    Ok(())
}
