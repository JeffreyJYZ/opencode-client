//! Resolution of the opencode server target handed to the webview.
//!
//! The webview cannot read the server's registration file: it lives outside the
//! app's own storage and it carries a credential. So the shell resolves the target
//! in Rust and injects the result into the page as `window.__OC_TARGET__` before any
//! of the app's own scripts run.
//!
//! First match wins:
//!
//! 1. the environment — `OPENCODE_SERVER_URL` plus `OPENCODE_PASSWORD` or
//!    `OPENCODE_AUTH_TOKEN`: the dev and CI override;
//! 2. the registered service file (default `~/.local/state/opencode/service.json`,
//!    `OPENCODE_SERVICE_FILE` overrides the path) — **read only, never written**;
//! 3. nothing — inject no global at all, so the page falls back to its own origin,
//!    which is the web build's normal path.

use std::env;
use std::fs;
use std::path::PathBuf;

use serde::Deserialize;

/// Env var carrying the server url for the override.
const ENV_URL: &str = "OPENCODE_SERVER_URL";
/// Env var carrying the server password.
const ENV_PASSWORD: &str = "OPENCODE_PASSWORD";
/// Env var carrying a server auth token, used when no password is set.
const ENV_AUTH_TOKEN: &str = "OPENCODE_AUTH_TOKEN";
/// Env var overriding the registration file path.
const ENV_SERVICE_FILE: &str = "OPENCODE_SERVICE_FILE";
/// The registration file, relative to `$HOME`.
const SERVICE_FILE: &str = ".local/state/opencode/service.json";
/// The global the page reads. Spec 010 §Window; the shape is fixed.
const GLOBAL_NAME: &str = "window.__OC_TARGET__";

/// A resolved server target.
///
/// Deserialised straight from the registration file, which also carries `id`,
/// `version` and `pid`; only these two fields are used, the rest are ignored.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct Target {
    /// The server's base url.
    pub url: String,
    /// The password its HTTP basic auth expects (`opencode:<password>`).
    pub password: String,
}

impl Target {
    /// The script the webview runs before the page's own scripts.
    ///
    /// The value is JSON-serialised and then embedded, never string-interpolated:
    /// a password containing a quote, a backslash or a newline cannot break out of
    /// the literal or inject code into the page.
    pub fn initialization_script(&self) -> String {
        let payload = serde_json::json!({ "url": self.url, "password": self.password });
        format!("{GLOBAL_NAME} = {payload};")
    }

    /// The log line for this target: the url, and the password's length at most.
    ///
    /// The password must never reach a log, a window title or the DOM.
    pub fn redacted(&self) -> String {
        format!(
            "url={} password=<{} chars>",
            self.url,
            self.password.chars().count()
        )
    }
}

/// The target for this launch, or `None` when nothing is configured.
pub fn resolve() -> Option<Target> {
    from_env().or_else(from_service_file)
}

/// The env override: a url together with a credential.
fn from_env() -> Option<Target> {
    let url = set(env::var(ENV_URL))?;
    let password = set(env::var(ENV_PASSWORD)).or_else(|| set(env::var(ENV_AUTH_TOKEN)))?;
    Some(Target { url, password })
}

/// The registered service file. Missing, unreadable or malformed is `None`.
fn from_service_file() -> Option<Target> {
    let contents = fs::read_to_string(service_file_path()?).ok()?;
    let target: Target = serde_json::from_str(&contents).ok()?;
    // The password stays byte-exact: it is opaque data the server wrote.
    (!target.url.trim().is_empty()).then_some(target)
}

/// `OPENCODE_SERVICE_FILE`, else `$HOME/.local/state/opencode/service.json`.
fn service_file_path() -> Option<PathBuf> {
    if let Some(path) = set(env::var(ENV_SERVICE_FILE)) {
        return Some(PathBuf::from(path));
    }
    Some(PathBuf::from(set(env::var("HOME"))?).join(SERVICE_FILE))
}

/// `Some(value)` when the variable is set to something other than blank.
fn set(value: Result<String, env::VarError>) -> Option<String> {
    let value = value.ok()?;
    let trimmed = value.trim();
    (!trimmed.is_empty()).then(|| trimmed.to_owned())
}
