//! Unit tests for the policy and the script that installs it.
//!
//! The policy's job is to cover what the app does today and widen nothing else:
//! the resolved server's **origin**, never a copied guess, and no directive for a
//! consumer that cannot run yet. The dev/prod split must not leak either way.

use crate::target::Target;

use super::{initialization_script, policy};

fn target(url: &str) -> Target {
    Target {
        url: url.to_owned(),
        password: "pw".to_owned(),
    }
}

fn probe() -> Target {
    target("http://127.0.0.1:49374")
}

#[test]
fn default_src_is_the_base_for_everything() {
    assert!(policy(None, false).starts_with("default-src 'self'; "));
}

#[test]
fn connect_src_carries_the_resolved_origin_and_nothing_else() {
    let policy = policy(Some(&probe()), false);
    assert!(
        policy.contains("connect-src 'self' http://127.0.0.1:49374"),
        "{policy}"
    );
}

#[test]
fn the_connect_src_origin_drops_the_path_and_the_query() {
    let target = target("http://127.0.0.1:49374/api/experimental?token=x");
    let policy = policy(Some(&target), false);
    // The origin matches every path on the server; a path in the source would
    // match none of the app's own calls.
    assert!(
        policy.contains("connect-src 'self' http://127.0.0.1:49374;"),
        "{policy}"
    );
    assert!(!policy.contains("/api/experimental"), "{policy}");
}

#[test]
fn an_https_server_is_allowed_as_its_own_origin() {
    let target = target("https://opencode.example.com");
    assert!(
        policy(Some(&target), false).contains("connect-src 'self' https://opencode.example.com")
    );
}

#[test]
fn a_malformed_url_widens_nothing() {
    // Resolution only trims; it never validates. A url that will not parse must
    // leave the policy at the app's own origin rather than emitting a wildcard.
    for bad in ["not a url", "", "javascript:alert(1)", "file:///etc/passwd"] {
        let policy = policy(Some(&target(bad)), false);
        assert!(policy.contains("connect-src 'self';"), "{bad}: {policy}");
    }
}

#[test]
fn with_no_target_only_the_apps_own_origin_is_allowed() {
    // Spec 010 §Window point 3: no target is a normal state, and the page falls
    // back to its own origin. Nothing else may be reachable.
    let policy = policy(None, false);
    assert!(policy.contains("connect-src 'self';"), "{policy}");
    assert!(!policy.contains("http"), "{policy}");
}

#[test]
fn production_scripts_come_from_the_bundle_only() {
    let policy = policy(Some(&probe()), false);
    assert!(policy.contains("script-src 'self';"), "{policy}");
    assert!(!policy.contains("'unsafe-eval'"), "{policy}");
}

#[test]
fn a_dev_build_allows_the_inline_preamble_and_the_hmr_socket() {
    let policy = policy(Some(&probe()), true);
    assert!(
        policy.contains("script-src 'self' 'unsafe-inline'"),
        "{policy}"
    );
    assert!(policy.contains("ws://localhost:1420"), "{policy}");
}

#[test]
fn the_dev_relaxations_cannot_leak_into_production() {
    // Styles allow `'unsafe-inline'` in both builds (see STYLE_SRC); the two that
    // are dev-only are the inline-script allowance and the HMR websocket.
    let policy = policy(Some(&probe()), false);
    assert!(
        !policy.contains("script-src 'self' 'unsafe-inline'"),
        "{policy}"
    );
    assert!(!policy.contains("ws://"), "{policy}");
    assert!(!policy.contains("localhost:1420"), "{policy}");
}

#[test]
fn the_policy_is_embedded_as_a_json_literal_verbatim() {
    let expected = serde_json::to_string(&policy(Some(&probe()), false)).expect("a string");
    let script = initialization_script(Some(&probe()), false);
    assert!(script.contains(&format!("var p={expected};")), "{script}");
    assert!(script.starts_with("(function(){"), "{script}");
}

#[test]
fn the_policy_is_installed_before_the_target_global() {
    let script = initialization_script(Some(&probe()), false);
    let meta = script
        .find("Content-Security-Policy")
        .expect("the meta script");
    let global = script.find("window.__OC_TARGET__").expect("the global");
    assert!(meta < global, "{script}");
}

#[test]
fn no_target_injects_no_global() {
    let script = initialization_script(None, false);
    assert!(!script.contains("__OC_TARGET__"), "{script}");
    assert!(script.contains("Content-Security-Policy"), "{script}");
}

#[test]
fn a_loading_document_waits_for_head_and_never_writes_it() {
    // At document start `head` does not exist yet. The policy must be applied
    // once it does — and `document.write` is not an option: called before the
    // parser starts it empties the document (measured in the real webview, where
    // the page never loaded and the init script never reached the target global).
    let script = initialization_script(Some(&probe()), false);
    assert!(script.contains("MutationObserver"), "{script}");
    assert!(!script.contains("document.write"), "{script}");
    // The global still follows, in the same script.
    assert!(script.contains("window.__OC_TARGET__"), "{script}");
}
