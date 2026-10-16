//! Where the shell looks for a release, named once.
//!
//! `tauri-plugin-updater` reads its endpoint from the `plugins.updater` block of
//! `tauri.conf.json` — it has no Rust-side default — so the config is the copy
//! that is actually fetched. This constant is the **name** the shell prints at
//! startup so an operator can see which release channel a build points at, and
//! the test below fails the build if the two ever differ, which is the same shape
//! the navigation guard uses for `devUrl`.
//!
//! The manifest this points at is the format the plugin fetches: a JSON document
//! with a `version` and a `platforms` map, published as a release asset. Nothing
//! hosts one yet — the repository has no remote — so the updater is wired and
//! inert until M5.5 publishes a release. The **private** signing key is never in
//! this repository: it lives at `~/.tauri/opencode-client.key` and reaches a build
//! only as `TAURI_SIGNING_PRIVATE_KEY`, which is why the committed
//! `bundle.createUpdaterArtifacts` stays off and a release build turns it on.

/// The release manifest the updater fetches. GitHub's `latest/download` alias, so
/// the endpoint never names a version and never needs editing at a release.
pub const UPDATE_ENDPOINT: &str =
    "https://github.com/jyz/opencode-client/releases/latest/download/latest.json";

#[cfg(test)]
mod tests;
