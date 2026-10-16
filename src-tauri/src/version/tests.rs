//! The version cannot drift, and these are the three ways it could.

use super::{PACKAGE_JSON, TAURI_CONF_JSON, version_from_json};

#[test]
fn package_json_holds_the_version_the_crate_is_built_with() {
    let from_package = version_from_json(PACKAGE_JSON).expect("package.json has a version");
    assert_eq!(
        from_package,
        env!("CARGO_PKG_VERSION"),
        "package.json and Cargo.toml disagree; package.json is the source, so Cargo.toml is the one to fix"
    );
}

#[test]
fn tauri_conf_reads_its_version_from_package_json_instead_of_holding_one() {
    let conf: serde_json::Value =
        serde_json::from_str(TAURI_CONF_JSON).expect("tauri.conf.json parses");
    let version = conf["version"].as_str().expect("version is a string");
    assert_eq!(
        version, "../package.json",
        "tauri.conf.json must hold the path, not a number — a number is a second copy that can drift"
    );
}

#[test]
fn a_document_without_a_usable_version_has_none() {
    assert_eq!(version_from_json("{}"), None);
    assert_eq!(version_from_json("not json"), None);
    assert_eq!(version_from_json(r#"{"version": 3}"#), None);
}
