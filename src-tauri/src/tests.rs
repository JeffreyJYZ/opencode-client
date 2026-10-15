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
fn a_localhost_with_the_wrong_port_is_refused() {
    // The main checkout's Vite holds :5173; it is not this app's origin.
    assert!(!is_allowed_navigation(&url("http://localhost:5173/"), true));
    assert!(!is_allowed_navigation(
        &url("http://127.0.0.1:1420/"),
        true
    ));
}

#[test]
fn every_other_scheme_is_refused_without_panicking() {
    assert!(!is_allowed_navigation(&url("javascript:alert(1)"), true));
    assert!(!is_allowed_navigation(&url("file:///etc/passwd"), true));
}
