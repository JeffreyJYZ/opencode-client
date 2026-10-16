//! The preview read's real rules (M2.24), against a real temp file: what may be
//! read, the refusals, and the two cross-language pairs whose drift would be
//! silent — the size cap and the command name.

use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};

use super::{
    IMAGE_MAX_BYTES, base64, native_read_image, read_bounded, read_image, refusal, remember,
};

/// A fresh directory for one test; the test removes it when it is done.
fn fresh_dir(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!("m224-{}-{name}", std::process::id()));
    let _ = fs::remove_dir_all(&dir);
    fs::create_dir_all(&dir).expect("a temp dir");
    dir
}

/// A set holding exactly `path`, standing in for a drop's own paths.
fn dropped(path: &Path) -> HashSet<PathBuf> {
    HashSet::from([path.to_path_buf()])
}

#[test]
fn base64_matches_the_known_vectors() {
    // RFC 4648's own vectors, so the padding arms are pinned, not guessed.
    for (bytes, expected) in [
        (&b""[..], ""),
        (&b"f"[..], "Zg=="),
        (&b"fo"[..], "Zm8="),
        (&b"foo"[..], "Zm9v"),
        (&b"foob"[..], "Zm9vYg=="),
        (&b"fooba"[..], "Zm9vYmE="),
        (&b"foobar"[..], "Zm9vYmFy"),
    ] {
        assert_eq!(base64(bytes), expected, "{bytes:?}");
    }
}

#[test]
fn a_relative_path_a_nul_and_an_undropped_path_are_each_refused() {
    let file = fresh_dir("refusal").join("shot.png");
    fs::write(&file, b"x").expect("a file");
    let set = dropped(&file);
    let path = file.to_string_lossy().into_owned();

    assert!(refusal("relative/shot.png", &set).is_some());
    assert!(refusal("/tmp/a\0b.png", &set).is_some());
    assert!(refusal("/tmp/never-dropped.png", &set).is_some());
    assert!(refusal(&path, &set).is_none());
    fs::remove_dir_all(file.parent().expect("a parent")).ok();
}

#[test]
fn a_dropped_file_reads_as_base64_of_its_own_bytes() {
    let dir = fresh_dir("read");
    let file = dir.join("shot.png");
    // A real PNG signature: binary, not UTF-8 text, which is why the read is bytes.
    let bytes: &[u8] = &[0x89, b'P', b'N', b'G', 0x0d, 0x0a, 0x1a, 0x0a];
    fs::write(&file, bytes).expect("a file");

    let path = file.to_string_lossy().into_owned();
    assert_eq!(
        read_image(&path, &dropped(&file)).expect("a read"),
        base64(bytes)
    );
    fs::remove_dir_all(&dir).ok();
}

#[test]
fn a_directory_is_refused_even_when_it_was_dropped() {
    let dir = fresh_dir("directory");
    let error = read_image(&dir.to_string_lossy(), &dropped(&dir)).expect_err("a directory");
    assert!(error.contains("is a directory"), "{error}");
    fs::remove_dir_all(&dir).ok();
}

#[test]
fn a_file_over_the_cap_is_refused_not_truncated() {
    let dir = fresh_dir("cap");
    let file = dir.join("huge.png");
    // A sparse file one byte over the cap: the read takes one byte past the cap and
    // refuses, so a file that grew is refused rather than half-read.
    fs::File::create(&file)
        .expect("a file")
        .set_len(IMAGE_MAX_BYTES + 1)
        .expect("a length");
    let error = read_image(&file.to_string_lossy(), &dropped(&file)).expect_err("over the cap");
    assert!(error.contains("larger than"), "{error}");

    // The same rule at a small cap, so the boundary itself is pinned.
    let small = dir.join("small.bin");
    fs::write(&small, b"abcde").expect("a file");
    assert!(read_bounded(&small, 4).is_err());
    assert_eq!(read_bounded(&small, 5).expect("exactly the cap"), b"abcde");
    fs::remove_dir_all(&dir).ok();
}

#[test]
fn the_command_reads_a_path_a_drop_remembered_and_no_other() {
    let dir = fresh_dir("command");
    let file = dir.join("shot.png");
    fs::write(&file, b"hi").expect("a file");
    let path = file.to_string_lossy().into_owned();

    assert!(native_read_image(path.clone()).is_err());
    remember(&[path.clone()]);
    assert_eq!(native_read_image(path).expect("a read"), base64(b"hi"));
    fs::remove_dir_all(&dir).ok();
}

/// The value `COMPOSER_PREVIEW_MAX_BYTES` names, read as the product its own
/// expression spells (`8 * 1024 * 1024`), so the two caps are tied by value rather
/// than by a copied literal.
fn typescript_preview_cap() -> u64 {
    const PREVIEW: &str = include_str!("../../../../src/constants/preview.ts");
    const NAME: &str = "COMPOSER_PREVIEW_MAX_BYTES =";
    let start = PREVIEW
        .find(NAME)
        .expect("COMPOSER_PREVIEW_MAX_BYTES in preview.ts");
    let rest = &PREVIEW[start + NAME.len()..];
    let end = rest.find(';').expect("the declaration's semicolon");
    rest[..end]
        .split('*')
        .map(|factor| {
            factor
                .trim()
                .replace('_', "")
                .parse::<u64>()
                .expect("a numeric factor")
        })
        .product()
}

#[test]
fn the_cap_and_the_command_name_agree_with_the_typescript_constants() {
    assert_eq!(
        typescript_preview_cap(),
        IMAGE_MAX_BYTES,
        "preview.ts's cap and the shell's have drifted"
    );

    const NATIVE: &str = include_str!("../../../../src/constants/native.ts");
    assert!(
        NATIVE.contains("\"native_read_image\""),
        "native.ts does not name the read command"
    );
}
