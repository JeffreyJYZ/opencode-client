//! Unit tests for the resolved target's rendering.
//!
//! The password must never leave this module through a `{:?}`, a log line or
//! the injected script's literal — only its length may.

use super::Target;

fn target(url: &str, password: &str) -> Target {
    Target {
        url: url.to_owned(),
        password: password.to_owned(),
    }
}

#[test]
fn debug_redacts_the_password() {
    let target = target("http://127.0.0.1:49374", "s3cret");
    let shown = format!("{target:?}");
    assert!(shown.contains("http://127.0.0.1:49374"), "{shown}");
    assert!(shown.contains("<6 chars>"), "{shown}");
    assert!(!shown.contains("s3cret"), "{shown}");
}

#[test]
fn redacted_is_the_documented_log_line() {
    let line = target("http://127.0.0.1:49374", "abcdef").redacted();
    assert_eq!(line, "url=http://127.0.0.1:49374 password=<6 chars>");
}

#[test]
fn initialization_script_embeds_an_escaped_json_literal() {
    let script = target("http://127.0.0.1:49374", "pa\"ss\\wo\nrd").initialization_script();
    assert!(script.starts_with("window.__OC_TARGET__ = {"));
    assert!(script.ends_with("};"));
    // The newline and the quote are escaped, so the literal cannot break out.
    assert!(!script.contains('\n'), "{script}");
    assert!(script.contains(r#"pa\"ss\\wo\nrd"#), "{script}");
}
