//! The page-facing commands (M4.16): one per `NativeFs` method, plus the data root.
//!
//! Every command answers `Result<_, String>`: a refusal is one logged `[shell]`
//! line and a rejected promise, never a panic. The names are the seam the TS
//! constants mirror, and `tests.rs` reads `src/constants/native.ts`, so a rename on
//! either side fails a test.

use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager};

use super::{list, make_dir, read_text, real_path, remove, write_text};

/// The app's data root: the directory `plugin-data/<id>/` lives under.
fn app_data_root(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|error| format!("no app data dir ({error})"))
}

/// A refusal is one `[shell]` line, then the same message as the rejection.
fn refused(command: &str, error: String) -> String {
    println!("[shell] {command} refused: {error}");
    error
}

#[tauri::command]
pub fn native_data_root(app: AppHandle) -> Result<String, String> {
    app_data_root(&app).map(|dir| dir.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn native_realpath(app: AppHandle, path: String) -> Result<String, String> {
    let root = app_data_root(&app).map_err(|error| refused("native_realpath", error))?;
    real_path(&root, Path::new(&path)).map_err(|error| refused("native_realpath", error))
}

#[tauri::command]
pub fn native_read_text(app: AppHandle, path: String) -> Result<String, String> {
    let root = app_data_root(&app).map_err(|error| refused("native_read_text", error))?;
    read_text(&root, Path::new(&path)).map_err(|error| refused("native_read_text", error))
}

#[tauri::command]
pub fn native_write_text(app: AppHandle, path: String, value: String) -> Result<(), String> {
    let root = app_data_root(&app).map_err(|error| refused("native_write_text", error))?;
    write_text(&root, Path::new(&path), &value).map_err(|error| refused("native_write_text", error))
}

#[tauri::command]
pub fn native_list(app: AppHandle, path: String) -> Result<Vec<String>, String> {
    let root = app_data_root(&app).map_err(|error| refused("native_list", error))?;
    list(&root, Path::new(&path)).map_err(|error| refused("native_list", error))
}

#[tauri::command]
pub fn native_remove(app: AppHandle, path: String) -> Result<(), String> {
    let root = app_data_root(&app).map_err(|error| refused("native_remove", error))?;
    remove(&root, Path::new(&path)).map_err(|error| refused("native_remove", error))
}

#[tauri::command]
pub fn native_mkdirp(app: AppHandle, path: String) -> Result<(), String> {
    let root = app_data_root(&app).map_err(|error| refused("native_mkdirp", error))?;
    make_dir(&root, Path::new(&path)).map_err(|error| refused("native_mkdirp", error))
}
