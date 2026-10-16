//! The `initialization_script` half: where the policy goes in the document, and
//! that the target global still follows it. Kept apart from `tests.rs`'s policy
//! assertions — a different unit (the script's shape), so neither file has to grow
//! past the house cap to hold both.

use crate::target::Target;

use super::{initialization_script, policy};

fn probe() -> Target {
    Target {
        url: "http://127.0.0.1:49374".to_owned(),
        password: "pw".to_owned(),
    }
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
