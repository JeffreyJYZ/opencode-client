//! The endpoint exists in exactly one place, and this is the proof.

use super::UPDATE_ENDPOINT;
use crate::version::TAURI_CONF_JSON;

#[test]
fn the_config_fetches_the_endpoint_this_module_names() {
    let conf: serde_json::Value =
        serde_json::from_str(TAURI_CONF_JSON).expect("tauri.conf.json parses");
    let endpoints = conf["plugins"]["updater"]["endpoints"]
        .as_array()
        .expect("plugins.updater.endpoints is an array");
    assert_eq!(
        endpoints.len(),
        1,
        "one endpoint, so a failure is unambiguous"
    );
    assert_eq!(
        endpoints[0].as_str(),
        Some(UPDATE_ENDPOINT),
        "tauri.conf.json and updates.rs disagree on where a release lives"
    );
}

#[test]
fn the_endpoint_is_https_and_names_no_version() {
    assert!(
        UPDATE_ENDPOINT.starts_with("https://"),
        "an update over plain http is a downgrade attack"
    );
    assert!(
        !UPDATE_ENDPOINT.contains("/download/v"),
        "a versioned endpoint has to be edited at every release, and a forgotten edit is a silent one"
    );
}

#[test]
fn a_public_key_is_configured_and_no_private_key_is() {
    let conf: serde_json::Value =
        serde_json::from_str(TAURI_CONF_JSON).expect("tauri.conf.json parses");
    let updater = &conf["plugins"]["updater"];
    assert!(
        updater["pubkey"]
            .as_str()
            .is_some_and(|key| !key.is_empty()),
        "without a public key the plugin refuses every update"
    );
    for forbidden in ["privateKey", "private_key", "TAURI_SIGNING_PRIVATE_KEY"] {
        assert!(
            updater.get(forbidden).is_none(),
            "{forbidden} must never be committed"
        );
    }
    assert!(
        conf["bundle"].get("createUpdaterArtifacts").is_none(),
        "signing artifacts needs the private key, and the committed build must run without one"
    );
}
