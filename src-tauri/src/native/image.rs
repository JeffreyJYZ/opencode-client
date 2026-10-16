//! Reading a dropped image for the composer's preview (M2.24).
//!
//! The webview cannot load a `file://` path: its origin is `tauri://localhost`,
//! and the policy admits only the app's own assets, the resolved server's origin
//! and `data:` (`csp.rs::IMG_SRC`). So the shell reads the file and hands the page
//! its bytes as base64; the page builds the `data:` url, which the policy already
//! admits. This route therefore widens the policy by **nothing** — no
//! `assetProtocol`, no new `img-src` source, no `convertFileSrc`.
//!
//! What may be read is the narrowest thing that works: an **absolute** path with
//! no NUL that this window's own drop handed over ([`remember`]), a file rather
//! than a directory, and no more than [`IMAGE_MAX_BYTES`]. Anything else is
//! refused, and a file over the cap is refused rather than truncated silently.

use std::collections::HashSet;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::{LazyLock, Mutex};

/// The largest image the preview reads, in bytes. **Kept in step with
/// `COMPOSER_PREVIEW_MAX_BYTES` in `src/constants/composer.ts`** — `tests.rs`
/// reads that file and fails the build if the two ever differ.
pub const IMAGE_MAX_BYTES: u64 = 8 * 1024 * 1024;

/// The absolute paths this window's drops have handed the page. It is the scope
/// of the read: a path the page invents is not in it and is refused.
static DROPPED: LazyLock<Mutex<HashSet<PathBuf>>> = LazyLock::new(|| Mutex::new(HashSet::new()));

#[cfg(test)]
mod tests;

/// Remember the paths a drop handed over, so a preview may read exactly those.
///
/// Called from `handle_drop` with the same strings the page received, so the two
/// sides name one file the same way.
pub fn remember(paths: &[String]) {
    if let Ok(mut dropped) = DROPPED.lock() {
        dropped.extend(paths.iter().map(PathBuf::from));
    }
}

/// Why `path` may not be read for a preview, or `None` when it may.
///
/// Absolute — a relative path would resolve against the app's own working
/// directory, which is not the drop's; no NUL — it cannot name a file; and one
/// this window's drop handed over — the set is the scope.
pub fn refusal(path: &str, dropped: &HashSet<PathBuf>) -> Option<String> {
    if !path.starts_with('/') {
        return Some(format!("{path:?} is not an absolute path"));
    }
    if path.contains('\0') {
        return Some(format!("{path:?} carries a NUL byte"));
    }
    if !dropped.contains(Path::new(path)) {
        return Some(format!("{path:?} was not dropped into this window"));
    }
    None
}

/// The base64 of the image at `path`, or the refusal that stops the preview.
pub fn read_image(path: &str, dropped: &HashSet<PathBuf>) -> Result<String, String> {
    if let Some(reason) = refusal(path, dropped) {
        return Err(reason);
    }
    let file = Path::new(path);
    if std::fs::metadata(file)
        .map_err(|error| error.to_string())?
        .is_dir()
    {
        return Err(format!("{path:?} is a directory"));
    }
    Ok(base64(&read_bounded(file, IMAGE_MAX_BYTES)?))
}

/// The bytes of `path`, or a refusal when it holds more than `max`.
///
/// Reads one byte past the cap rather than trusting the metadata's length: a file
/// that grows between the two is refused, not half-read.
fn read_bounded(path: &Path, max: u64) -> Result<Vec<u8>, String> {
    let file = std::fs::File::open(path).map_err(|error| error.to_string())?;
    let mut bytes = Vec::new();
    file.take(max + 1)
        .read_to_end(&mut bytes)
        .map_err(|error| error.to_string())?;
    if bytes.len() as u64 > max {
        return Err(format!("{} is larger than {max} bytes", path.display()));
    }
    Ok(bytes)
}

/// The standard base64 alphabet, in the order its six-bit values name it.
const ALPHABET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/// The base64 of `bytes`; the page puts it after `data:<mime>;base64,`.
///
/// Hand-rolled rather than a dependency: the crate's whole set is the runtime and
/// its plugins (`Cargo.toml`), and this is the one encoding the shell needs.
pub fn base64(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(bytes.len().div_ceil(3) * 4);
    for chunk in bytes.chunks(3) {
        let first = u32::from(chunk[0]);
        let second = u32::from(*chunk.get(1).unwrap_or(&0));
        let third = u32::from(*chunk.get(2).unwrap_or(&0));
        let triple = (first << 16) | (second << 8) | third;
        out.push(ALPHABET[(triple >> 18) as usize & 63] as char);
        out.push(ALPHABET[(triple >> 12) as usize & 63] as char);
        out.push(if chunk.len() > 1 {
            ALPHABET[(triple >> 6) as usize & 63] as char
        } else {
            '='
        });
        out.push(if chunk.len() > 2 {
            ALPHABET[triple as usize & 63] as char
        } else {
            '='
        });
    }
    out
}

/// `native_read_image` — the page's preview read (M2.24).
///
/// A refusal is one logged `[shell]` line and a rejected promise, never a panic,
/// in the style of the `native/fs` commands.
#[tauri::command]
pub fn native_read_image(path: String) -> Result<String, String> {
    let dropped = DROPPED.lock().map(|set| set.clone()).unwrap_or_default();
    read_image(&path, &dropped).map_err(|error| {
        println!("[shell] native_read_image refused: {error}");
        error
    })
}
