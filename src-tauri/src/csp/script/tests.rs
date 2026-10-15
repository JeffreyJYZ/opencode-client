//! Tests for the script that installs the policy into the document.

use super::meta_script;

#[test]
fn a_hostile_policy_cannot_break_out_of_its_literal() {
    // The policy is embedded as a JSON literal, so quotes, backslashes and line
    // terminators in it cannot end the string or start a statement.
    let script = meta_script("x\"y\\z\nw\u{2028}v");
    assert!(!script.contains('\n'), "{script}");
    assert!(!script.contains('\u{2028}'), "{script}");
    assert!(script.contains(r#"x\"y\\z\nw\u2028v"#), "{script}");
}
