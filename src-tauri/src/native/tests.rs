//! The native seam's decisions, without a window: which URL may leave the app,
//! which path may be opened in the editor, and the two cross-language pairs whose
//! drift would be silent — the scheme list and the drop event's name.

use super::{
    FILES_DROPPED_EVENT, NOTIFICATION_BODY, NOTIFICATION_TITLE, editor, is_editor_target,
    is_openable_url, links::OPENABLE_SCHEMES,
};

#[test]
fn the_web_and_mail_may_leave_the_app() {
    assert!(is_openable_url("https://example.com/docs"));
    assert!(is_openable_url("http://127.0.0.1:49374/"));
    assert!(is_openable_url("mailto:someone@example.com"));
}

#[test]
fn everything_else_is_refused_without_panicking() {
    for refused in [
        "javascript:alert(1)",
        "file:///etc/passwd",
        "data:text/html,<script>alert(1)</script>",
        "tauri://localhost/index.html",
        "not a url at all",
        "",
        "#fragment",
    ] {
        assert!(!is_openable_url(refused), "{refused} was not refused");
    }
}

#[test]
fn an_absolute_path_at_a_positive_line_is_an_editor_target() {
    assert!(is_editor_target("/Users/jyz/dev/a b;c.ts", 1));
    assert!(is_editor_target("/tmp/quote'and\"dquote.ts", 42));
}

#[test]
fn a_relative_path_a_zero_line_and_a_nul_are_refused() {
    assert!(!is_editor_target("src/a.ts", 1));
    assert!(!is_editor_target("/tmp/a.ts", 0));
    assert!(!is_editor_target("/tmp/a\0b.ts", 1));
}

#[test]
fn the_default_editor_is_a_name_not_a_command_line() {
    assert_eq!(editor::EDITOR_DEFAULT, "zed");
    assert!(!editor::EDITOR_DEFAULT.contains(char::is_whitespace));
}

/// The quoted strings of the TS `EXTERNAL_SCHEMES` array, without their trailing
/// colon. Read from the file, so the two lists cannot drift silently.
fn typescript_schemes() -> Vec<String> {
    const SOURCE: &str = include_str!("../../../src/constants/markdown.ts");
    let start = SOURCE
        .find("EXTERNAL_SCHEMES = [")
        .expect("EXTERNAL_SCHEMES in markdown.ts");
    let rest = &SOURCE[start..];
    let end = rest.find(']').expect("the array's closing bracket");
    rest[..end]
        .split('"')
        .skip(1)
        .step_by(2)
        .map(|scheme| scheme.trim_end_matches(':').to_owned())
        .collect()
}

#[test]
fn the_scheme_allowlist_agrees_with_the_typescript_constant() {
    assert_eq!(typescript_schemes(), OPENABLE_SCHEMES.to_vec());
}

#[test]
fn the_cross_language_strings_agree_with_the_typescript_constants() {
    const TS: &str = include_str!("../../../src/constants/native.ts");
    for (name, value) in [
        ("FILES_DROPPED_EVENT", FILES_DROPPED_EVENT),
        ("NOTIFICATION_TITLE", NOTIFICATION_TITLE),
        ("NOTIFICATION_BODY", NOTIFICATION_BODY),
    ] {
        let declaration = format!("{name} = \"{value}\";");
        assert!(
            TS.contains(&declaration),
            "native.ts does not declare `{declaration}`"
        );
    }
}
