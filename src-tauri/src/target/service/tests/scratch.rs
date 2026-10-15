//! A scratch directory and a registration-file body for the service tests.

use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};

/// A scratch directory under the system temp dir, removed on drop.
pub(super) struct Scratch(PathBuf);

impl Scratch {
    pub(super) fn new(name: &str) -> Self {
        let path = env::temp_dir().join(format!("oc-m0.2b-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&path);
        fs::create_dir_all(&path).expect("create scratch directory");
        Self(path)
    }

    pub(super) fn path(&self) -> &Path {
        &self.0
    }

    pub(super) fn write(&self, name: &str, contents: &str) -> PathBuf {
        let path = self.0.join(name);
        fs::write(&path, contents).expect("write registration file");
        path
    }

    /// Write `name` with an explicit modified time, for the newest-wins test.
    pub(super) fn write_at(&self, name: &str, contents: &str, seconds: u64) -> PathBuf {
        let path = self.write(name, contents);
        let modified = SystemTime::UNIX_EPOCH + Duration::from_secs(seconds);
        fs::set_times(&path, fs::FileTimes::new().set_modified(modified)).expect("set mtime");
        path
    }
}

impl Drop for Scratch {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

/// A registration file body, with the url JSON-escaped.
pub(super) fn registration(url: &str) -> String {
    serde_json::json!({
        "id": "abc123",
        "version": "2.0.29",
        "pid": 4321,
        "url": url,
        "password": "s3cret",
    })
    .to_string()
}
