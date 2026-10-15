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
//! 2. the registered service file — located by [`service`] under
//!    `$XDG_STATE_HOME/opencode` (default `~/.local/state/opencode`),
//!    **read only, never written**;
//! 3. nothing — inject no global at all, so the page falls back to its own origin,
//!    which is the web build's normal path.

use std::env;
use std::fmt;

use serde::Deserialize;

mod service;

#[cfg(test)]
mod tests;

/// Env var carrying the server url for the override.
const ENV_URL: &str = "OPENCODE_SERVER_URL";
/// Env var carrying the server password.
const ENV_PASSWORD: &str = "OPENCODE_PASSWORD";
/// Env var carrying a server auth token, used when no password is set.
const ENV_AUTH_TOKEN: &str = "OPENCODE_AUTH_TOKEN";
/// The global the page reads. Spec 010 §Window; the shape is fixed.
const GLOBAL_NAME: &str = "window.__OC_TARGET__";

/// A resolved server target.
///
/// Deserialised straight from the registration file, which also carries `id`,
/// `version` and `pid`; only these two fields are used, the rest are ignored.
/// `Debug` is hand-written below: a derived one would print the password.
#[derive(Deserialize)]
pub struct Target {
    /// The server's base url.
    pub url: String,
    /// The password its HTTP basic auth expects (`opencode:<password>`).
    pub password: String,
}

impl fmt::Debug for Target {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("Target")
            .field("url", &self.url)
            .field("password", &self.masked_password())
            .finish()
    }
}

impl Target {
    /// The script the webview runs before the page's own scripts.
    ///
    /// The value is JSON-serialised and then embedded, never string-interpolated:
    /// a password containing a quote, a backslash, a newline, U+2028 or U+2029
    /// cannot break out of the literal or inject code into the page. U+2028 and
    /// U+2029 are escaped explicitly because `serde_json` does not escape them
    /// (older JS parsers treat them as line terminators inside a string).
    pub fn initialization_script(&self) -> String {
        let payload = serde_json::json!({ "url": self.url, "password": self.password }).to_string();
        // serde_json does not escape U+2028/U+2029; escape them so correctness
        // never depends on the engine's JS version.
        let payload = payload
            .replace('\u{2028}', "\\u2028")
            .replace('\u{2029}', "\\u2029");
        format!("{GLOBAL_NAME} = {payload};")
    }

    /// The log line for this target: the url, and the password's length at most.
    ///
    /// The password must never reach a log, a window title or the DOM.
    pub fn redacted(&self) -> String {
        format!("url={} password={}", self.url, self.masked_password())
    }

    /// The password's length — the most of it that may ever be printed.
    fn masked_password(&self) -> String {
        format!("<{} chars>", self.password.chars().count())
    }
}

/// The target for this launch, or `None` when nothing is configured.
pub fn resolve() -> Option<Target> {
    from_env().or_else(service::from_service_file)
}

/// The env override: a url together with a credential.
fn from_env() -> Option<Target> {
    let url = set(env::var(ENV_URL))?;
    let password = set(env::var(ENV_PASSWORD)).or_else(|| set(env::var(ENV_AUTH_TOKEN)))?;
    Some(Target { url, password })
}

/// `Some(value)` when the variable is set to something other than blank.
fn set(value: Result<String, env::VarError>) -> Option<String> {
    let value = value.ok()?;
    let trimmed = value.trim();
    (!trimmed.is_empty()).then(|| trimmed.to_owned())
}
