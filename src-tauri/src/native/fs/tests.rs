//! The plugin filesystem's real rules (M4.16), against a real temp directory: what
//! is inside the plugin's own `plugin-data/<id>/`, and the three escapes.

use std::fs;
use std::path::{Path, PathBuf};

use super::{DATA_DIR, list, make_dir, read_text, real_path, remove, scoped, write_text};

/// A fresh root for one test; the test removes it when it is done.
fn fresh_root(name: &str) -> PathBuf {
    let root = std::env::temp_dir().join(format!("m416-{}-{name}", std::process::id()));
    let _ = fs::remove_dir_all(&root);
    fs::create_dir_all(&root).expect("a temp root");
    root
}

fn data_dir(root: &Path, id: &str) -> PathBuf {
    root.join(DATA_DIR).join(id)
}

#[test]
fn a_plugin_reads_and_writes_inside_its_own_directory() {
    let root = fresh_root("inside");
    let dir = data_dir(&root, "m416-a");
    make_dir(&root, &dir).expect("the data dir");
    let notes = dir.join("notes");
    make_dir(&root, &notes).expect("a subdirectory");
    let file = notes.join("today.txt");
    write_text(&root, &file, "hello").expect("a write");
    assert_eq!(read_text(&root, &file).expect("a read"), "hello");
    assert_eq!(list(&root, &dir).expect("a list"), ["notes"]);
    assert_eq!(list(&root, &notes).expect("a list"), ["today.txt"]);
    remove(&root, &file).expect("a remove");
    assert!(list(&root, &notes).expect("a list").is_empty());
    fs::remove_dir_all(&root).ok();
}

#[test]
fn a_parent_segment_is_refused() {
    let root = fresh_root("parent");
    let escape = data_dir(&root, "m416-a").join("../escape.txt");
    assert!(scoped(&root, &escape).is_err());
    assert!(write_text(&root, &escape, "x").is_err());
    assert!(!root.join("escape.txt").exists());
    fs::remove_dir_all(&root).ok();
}

#[test]
fn an_absolute_path_outside_the_data_directory_is_refused() {
    let root = fresh_root("absolute");
    assert!(scoped(&root, Path::new("/etc/passwd")).is_err());
    assert!(read_text(&root, Path::new("/etc/passwd")).is_err());
    fs::remove_dir_all(&root).ok();
}

#[test]
fn an_unsafe_plugin_id_is_refused() {
    let root = fresh_root("unsafe");
    assert!(scoped(&root, &root.join(DATA_DIR).join("..evil/file.txt")).is_err());
    assert!(scoped(&root, &root.join(DATA_DIR).join(".hidden/file.txt")).is_err());
    assert!(scoped(&root, &root.join(DATA_DIR)).is_err());
    fs::remove_dir_all(&root).ok();
}

#[test]
fn a_symlink_out_of_the_directory_is_refused_and_the_real_path_shows_why() {
    let root = fresh_root("symlink");
    let dir = data_dir(&root, "m416-a");
    make_dir(&root, &dir).expect("the data dir");
    let outside = root.join("outside");
    fs::create_dir_all(&outside).expect("the outside dir");
    std::os::unix::fs::symlink(&outside, dir.join("link")).expect("a symlink");

    // `real_path` resolves and reports the escape; the service is what refuses it.
    let real = real_path(&root, &dir.join("link")).expect("a real path");
    assert_eq!(
        Path::new(&real).canonicalize().expect("a real path"),
        outside.canonicalize().expect("a real path")
    );

    // A write and a read through the link are refused, and nothing lands outside.
    assert!(write_text(&root, &dir.join("link/escape.txt"), "x").is_err());
    assert!(read_text(&root, &dir.join("link/escape.txt")).is_err());
    assert!(
        fs::read_dir(&outside)
            .expect("the outside dir")
            .next()
            .is_none()
    );
    fs::remove_dir_all(&root).ok();
}

#[test]
fn the_data_dir_and_command_names_agree_with_the_typescript_constants() {
    const PLUGINS: &str = include_str!("../../../../src/constants/plugins.ts");
    let declaration = format!("PLUGIN_DATA_DIR = \"{DATA_DIR}\";");
    assert!(
        PLUGINS.contains(&declaration),
        "plugins.ts does not declare `{declaration}`"
    );

    const NATIVE: &str = include_str!("../../../../src/constants/native.ts");
    for name in [
        "native_data_root",
        "native_realpath",
        "native_read_text",
        "native_write_text",
        "native_list",
        "native_remove",
        "native_mkdirp",
    ] {
        assert!(
            NATIVE.contains(&format!("\"{name}\"")),
            "native.ts does not name `{name}`"
        );
    }
}
