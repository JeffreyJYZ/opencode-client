//! Where the app's version comes from.
//!
//! **`package.json` is the only file that holds a version literal.** The reason
//! is not tidiness: there are three copies of this number in a Tauri app's build
//! — the JS package the page is built from, the config the bundle is stamped
//! with, and the crate `cargo` compiles — and a hand-edited release is how they
//! drift. So two of the three are not copies at all:
//!
//! - `tauri.conf.json`'s `version` is the **path** `../package.json`. The config
//!   holds no number, so it cannot disagree with the file it reads.
//! - `Cargo.toml`'s version is the one remaining copy — `cargo` needs it and
//!   `app.package_info().version` reports it — so the tests below read
//!   `package.json` at compile time and fail the build the moment the two
//!   diverge.
//!
//! The page displays the version through `getVersion()` (the bundle's own
//! metadata, which the config above makes the same number) and the shell shows
//! it in the About panel, which is why this module is the one both read.

/// `package.json`, read at compile time so the tests see the version the build
/// is made from rather than whatever is on disk after it.
pub const PACKAGE_JSON: &str = include_str!("../../package.json");

/// `src-tauri/tauri.conf.json`, read at compile time for the same reason. Test
/// only: the running shell reads the config Tauri has already parsed.
#[cfg(test)]
pub const TAURI_CONF_JSON: &str = include_str!("../tauri.conf.json");

/// The `version` field of a `package.json` document, or `None` when the document
/// does not parse or has no string version. A missing version must show as
/// missing, never as a guess: a version the app invents is worse than no version.
pub fn version_from_json(text: &str) -> Option<String> {
    let value: serde_json::Value = serde_json::from_str(text).ok()?;
    value.get("version")?.as_str().map(str::to_owned)
}

#[cfg(test)]
mod tests;
