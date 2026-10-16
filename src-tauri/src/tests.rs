//! Unit tests for the navigation guard.
//!
//! The guard's whole job is to keep the injected target from reaching a foreign
//! origin, and its worst bug is blocking the app's own document — which for
//! `initialization_script` means the app never loads. Both directions are here.

use tauri::Url;

use crate::is_allowed_navigation;

fn url(value: &str) -> Url {
    value.parse().expect("a valid url")
}

#[test]
fn the_production_origin_is_allowed() {
    let app = url("tauri://localhost/index.html");
    assert!(is_allowed_navigation(&app, false));
    assert!(is_allowed_navigation(&app, true));
}

#[test]
fn the_dev_origin_is_allowed_only_in_a_dev_build() {
    let dev = url("http://localhost:1420/");
    assert!(is_allowed_navigation(&dev, true));
    assert!(!is_allowed_navigation(&dev, false));
}

#[test]
fn a_foreign_origin_is_refused() {
    let foreign = url("https://example.com/");
    assert!(!is_allowed_navigation(&foreign, true));
    assert!(!is_allowed_navigation(&foreign, false));
}

#[test]
fn a_foreign_tauri_authority_is_refused() {
    // `tauri://evil/...` is still served by this app's own asset handler, but
    // it is a distinct origin and must not receive the injected target.
    let evil = url("tauri://evil/index.html");
    assert!(!is_allowed_navigation(&evil, false));
    assert!(!is_allowed_navigation(&evil, true));
}

#[test]
fn dev_url_and_dev_port_agree() {
    // The config's devUrl and the shell's DEV_* must agree: a drift refuses the
    // app's own document and leaves the window blank. Proves the coupling is
    // real rather than a comment.
    const CONF: &str = include_str!("../tauri.conf.json");
    let conf: serde_json::Value = serde_json::from_str(CONF).expect("valid tauri.conf.json");
    let dev_url = conf["build"]["devUrl"].as_str().expect("devUrl string");
    let expected = format!(
        "{}://{}:{}",
        super::DEV_SCHEME,
        super::DEV_HOST,
        super::DEV_PORT
    );
    assert_eq!(dev_url, expected);
}

#[test]
fn a_localhost_with_the_wrong_port_is_refused() {
    // The main checkout's Vite holds :5173; it is not this app's origin.
    assert!(!is_allowed_navigation(&url("http://localhost:5173/"), true));
    assert!(!is_allowed_navigation(&url("http://127.0.0.1:1420/"), true));
}

#[test]
fn every_other_scheme_is_refused_without_panicking() {
    assert!(!is_allowed_navigation(&url("javascript:alert(1)"), true));
    assert!(!is_allowed_navigation(&url("file:///etc/passwd"), true));
}

#[test]
fn safe_ids_agree_with_the_shared_corpus() {
    // The one rule both languages implement: `PLUGIN_ID_PATTERN` is the shared
    // spelling and `plugin-id-cases.json` is the shared verdicts. The TS half is
    // `src/plugins/manifest.test.ts`; a change to either side's allowlist fails one
    // of the two tests, which is the drift guard spec 040 §Manifest asks for.
    const CORPUS: &str = include_str!("../../src/plugins/plugin-id-cases.json");
    let corpus: serde_json::Value = serde_json::from_str(CORPUS).expect("valid corpus json");
    assert_eq!(
        corpus["pattern"].as_str().expect("a pattern"),
        super::PLUGIN_ID_PATTERN
    );
    let cases = corpus["cases"].as_array().expect("cases");
    assert!(!cases.is_empty(), "the corpus must not be empty");
    for case in cases {
        let id = case["id"].as_str().expect("an id");
        let valid = case["valid"].as_bool().expect("a validity");
        assert_eq!(
            super::safe_id(id),
            valid,
            "safe_id({id:?}) disagrees with the corpus"
        );
    }
}
