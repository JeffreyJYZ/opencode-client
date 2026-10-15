//! Locating and reading the server's registration file.
//!
//! Read only, never written. Every failure — an unreadable directory, no
//! candidate, a malformed candidate — is silent and falls through to "no
//! target", never a panic and never a partial target: the shell still opens
//! and the page's own fallback reports the fault.
//!
//! `std::env` is read only at the boundary ([`from_service_file`]); everything
//! that decides is a pure function so the choice is testable without a file
//! system or a mutated environment.

use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

use super::{Target, set};

#[cfg(test)]
mod tests;

/// Env var overriding the registration file path.
const ENV_SERVICE_FILE: &str = "OPENCODE_SERVICE_FILE";
/// Env var relocating the state tree the registration file lives under.
const ENV_STATE_HOME: &str = "XDG_STATE_HOME";
/// The registration directory's name under `$XDG_STATE_HOME`.
const STATE_DIR: &str = "opencode";
/// The registration directory relative to `$HOME` when `$XDG_STATE_HOME` is unset.
const DEFAULT_STATE_DIR: &str = ".local/state/opencode";
/// The registration file a release channel writes.
const SERVICE_FILE: &str = "service.json";
/// A channel-suffixed registration file starts with this.
const CHANNEL_PREFIX: &str = "service-";
/// …and ends with this.
const CHANNEL_SUFFIX: &str = ".json";

/// The registered service file. Missing, unreadable or malformed is `None`.
pub(super) fn from_service_file() -> Option<Target> {
    resolve_in(set(env::var(ENV_SERVICE_FILE)).as_deref(), service_dir())
}

/// [`from_service_file`] for explicit inputs, which is what the tests drive.
///
/// A set `override_path` wins absolutely and skips the search. Otherwise
/// `service.json` in `dir` is preferred; when it is absent, the newest
/// `service-<channel>.json` is taken.
fn resolve_in(override_path: Option<&str>, dir: Option<PathBuf>) -> Option<Target> {
    if let Some(path) = override_path {
        return read_target(Path::new(path));
    }
    let dir = dir?;
    let preferred = dir.join(SERVICE_FILE);
    if preferred.is_file() {
        return read_target(&preferred);
    }
    let candidates = candidates(&dir);
    let name = newest_channel(&candidates)?;
    read_target(&dir.join(name))
}

/// The registration directory: `$XDG_STATE_HOME/opencode`, else
/// `$HOME/.local/state/opencode`.
fn service_dir() -> Option<PathBuf> {
    state_dir(set(env::var(ENV_STATE_HOME)), set(env::var("HOME")))
}

/// [`service_dir`]'s decision, pure over its two environment values.
fn state_dir(xdg_state_home: Option<String>, home: Option<String>) -> Option<PathBuf> {
    Some(match xdg_state_home {
        Some(state) => PathBuf::from(state).join(STATE_DIR),
        None => PathBuf::from(home?).join(DEFAULT_STATE_DIR),
    })
}

/// Read one registration file, trimming the url.
///
/// Missing, unreadable or malformed is `None`. The password stays byte-exact:
/// it is opaque data the server wrote, and nothing here interprets it.
fn read_target(path: &Path) -> Option<Target> {
    let contents = fs::read_to_string(path).ok()?;
    let mut target: Target = serde_json::from_str(&contents).ok()?;
    target.url = target.url.trim().to_owned();
    (!target.url.is_empty()).then_some(target)
}

/// A directory entry: a file name and its modified time in epoch seconds.
type Candidate = (String, u64);

/// The newest channel-suffixed registration's name.
///
/// Pure, so which file wins is testable without a file system. A tie keeps the
/// later entry, since names arrive in directory order.
fn newest_channel(candidates: &[Candidate]) -> Option<&str> {
    candidates
        .iter()
        .filter(|(name, _)| is_channel_file(name))
        .max_by_key(|(_, modified)| *modified)
        .map(|(name, _)| name.as_str())
}

/// Whether `name` is a `service-<channel>.json` registration file.
fn is_channel_file(name: &str) -> bool {
    name.len() > CHANNEL_PREFIX.len() + CHANNEL_SUFFIX.len()
        && name.starts_with(CHANNEL_PREFIX)
        && name.ends_with(CHANNEL_SUFFIX)
}

/// A directory's file names with their modified times. An unreadable directory
/// or entry is dropped: the shell falls through to "no target", never a panic.
fn candidates(dir: &Path) -> Vec<Candidate> {
    let Ok(entries) = fs::read_dir(dir) else {
        return Vec::new();
    };
    entries
        .flatten()
        .filter_map(|entry| {
            let name = entry.file_name().to_string_lossy().into_owned();
            let modified = entry.metadata().ok()?.modified().ok()?;
            Some((name, modified.duration_since(UNIX_EPOCH).ok()?.as_secs()))
        })
        .collect()
}
