//! Unit tests for registration-file discovery.
//!
//! Everything below is driven through `resolve_in` / `state_dir` with explicit
//! inputs, so no test mutates `std::env` (which is `unsafe` in edition 2024, and
//! racy besides). A real scratch directory exercises the file-system half.

mod scratch;

use std::path::PathBuf;

use super::{is_channel_file, newest_channel, resolve_in, state_dir};
use scratch::{Scratch, registration};

#[test]
fn xdg_state_home_wins_when_set() {
    let dir = state_dir(Some("/tmp/xdg".to_owned()), Some("/home/u".to_owned()));
    assert_eq!(dir, Some(PathBuf::from("/tmp/xdg/opencode")));
}

#[test]
fn state_dir_falls_back_to_home_then_nothing() {
    assert_eq!(
        state_dir(None, Some("/home/u".to_owned())),
        Some(PathBuf::from("/home/u/.local/state/opencode"))
    );
    assert_eq!(state_dir(None, None), None);
}

#[test]
fn service_json_is_preferred_over_a_channel_file() {
    let scratch = Scratch::new("preferred");
    scratch.write("service.json", &registration("http://service.test"));
    scratch.write("service-local.json", &registration("http://local.test"));
    let target = resolve_in(None, Some(scratch.path().to_owned())).expect("a target");
    assert_eq!(target.url, "http://service.test");
}

#[test]
fn a_channel_file_resolves_when_service_json_is_absent() {
    let scratch = Scratch::new("channel-only");
    scratch.write("service-local.json", &registration("http://local.test"));
    let target = resolve_in(None, Some(scratch.path().to_owned())).expect("a target");
    assert_eq!(target.url, "http://local.test");
}

#[test]
fn the_newest_channel_file_wins() {
    let scratch = Scratch::new("newest");
    scratch.write_at("service-local.json", &registration("http://old.test"), 1_000);
    scratch.write_at("service-dev.json", &registration("http://new.test"), 2_000);
    let target = resolve_in(None, Some(scratch.path().to_owned())).expect("a target");
    assert_eq!(target.url, "http://new.test");
}

#[test]
fn a_malformed_candidate_is_no_target() {
    let scratch = Scratch::new("malformed");
    scratch.write("service.json", "{ not json");
    assert!(resolve_in(None, Some(scratch.path().to_owned())).is_none());
}

#[test]
fn an_empty_directory_is_no_target() {
    let scratch = Scratch::new("empty");
    assert!(resolve_in(None, Some(scratch.path().to_owned())).is_none());
}

#[test]
fn a_missing_directory_is_no_target() {
    let scratch = Scratch::new("missing");
    let absent = scratch.path().join("nope");
    assert!(resolve_in(None, Some(absent)).is_none());
}

#[test]
fn the_override_path_short_circuits_the_search() {
    let scratch = Scratch::new("override");
    scratch.write("service.json", &registration("http://searched.test"));
    let explicit = scratch.write("elsewhere.json", &registration("http://explicit.test"));
    let target = resolve_in(explicit.to_str(), Some(scratch.path().to_owned())).expect("a target");
    assert_eq!(target.url, "http://explicit.test");
}

#[test]
fn the_url_is_injected_trimmed() {
    let scratch = Scratch::new("trim");
    scratch.write("service.json", &registration("  http://trim.test \n"));
    let target = resolve_in(None, Some(scratch.path().to_owned())).expect("a target");
    assert_eq!(target.url, "http://trim.test");
}

#[test]
fn a_blank_url_is_no_target() {
    let scratch = Scratch::new("blank");
    scratch.write("service.json", &registration("   "));
    assert!(resolve_in(None, Some(scratch.path().to_owned())).is_none());
}

#[test]
fn the_newest_channel_ignores_every_other_name() {
    let candidates = vec![
        ("service.json".to_owned(), 9_000),
        ("service-local.json".to_owned(), 1_000),
        ("notes.txt".to_owned(), 9_000),
    ];
    assert_eq!(newest_channel(&candidates), Some("service-local.json"));
    assert!(is_channel_file("service-local.json"));
    assert!(!is_channel_file("service.json"));
    assert!(!is_channel_file("service-.json"));
}
