//! The shell's native integrations (M5.2): hand a link to the OS browser, open a
//! file the session touched in the editor, notify that a turn ended, and pass a
//! dropped file's paths to the page.
//!
//! Every one of them is a **command the page invokes** except the drop, which the
//! shell watches for itself. Each answers `bool` and prints one `[shell]` line, so a
//! built app's stdout says what it did — including what it refused — and a refusal
//! is never silence.
//!
//! The two decisions worth owning live in their own modules and are unit-tested
//! without a window: `links` (which URL may leave) and `editor` (which path may be
//! opened). Nothing here re-implements either.

mod editor;
pub(crate) mod links;
#[cfg(test)]
mod tests;

use tauri::{AppHandle, Emitter, Runtime};
use tauri_plugin_notification::{NotificationExt, PermissionState};
use tauri_plugin_opener::OpenerExt;

pub use editor::is_editor_target;
pub use links::is_openable_url;

/// The window event carrying a drop's absolute paths (M5.2). Matched by
/// `FILES_DROPPED_EVENT` in `src/constants/native.ts`; `tests.rs` pins the pair.
pub const FILES_DROPPED_EVENT: &str = "oc:files-dropped";

/// The turn-end notification's two lines, matching `NOTIFICATION_*` in
/// `src/constants/native.ts`.
const NOTIFICATION_TITLE: &str = "opencode client";
const NOTIFICATION_BODY: &str = "A turn finished";

/// Hand `url` to the OS browser if it may leave the app.
///
/// The **one** place the decision is made: the menu's Help items and the page's
/// `open_external` both come through here, so a scheme outside `OPENABLE_SCHEMES` is
/// refused and logged exactly once, and neither caller can bypass it.
pub fn open_url<R: Runtime>(app: &AppHandle<R>, url: &str) -> bool {
    if !is_openable_url(url) {
        println!("[shell] refused to open {url}");
        return false;
    }
    match app.opener().open_url(url.to_owned(), None::<String>) {
        Ok(()) => {
            println!("[shell] open_external {url}");
            true
        }
        Err(error) => {
            println!("[shell] open_external failed: {error}");
            false
        }
    }
}

/// `open_external` — the page's half of the external-link hand-off (M5.2).
#[tauri::command]
pub fn open_external(app: AppHandle, url: String) -> bool {
    open_url(&app, &url)
}

/// `open_in_editor` — open a file the session touched, at its own line (M5.2).
#[tauri::command]
pub fn open_in_editor(path: String, line: u32) -> bool {
    if !is_editor_target(&path, line) {
        println!("[shell] refused to open {path}:{line} in the editor");
        return false;
    }
    match editor::spawn(&path, line) {
        Ok(()) => {
            println!("[shell] open_in_editor {path}:{line}");
            true
        }
        Err(error) => {
            println!("[shell] open_in_editor failed: {error}");
            false
        }
    }
}

/// `notify_turn_end` — post the turn-end notification (M5.2).
///
/// Permission is asked for **once**: a build that already has it never asks again,
/// and one that is refused stays inert and says so rather than posting silently.
#[tauri::command]
pub fn notify_turn_end(app: AppHandle) -> bool {
    let granted = matches!(
        app.notification().permission_state(),
        Ok(PermissionState::Granted)
    );
    if !granted {
        let _ = app.notification().request_permission();
        let after = matches!(
            app.notification().permission_state(),
            Ok(PermissionState::Granted)
        );
        if !after {
            println!("[shell] notification refused");
            return false;
        }
    }
    match app
        .notification()
        .builder()
        .title(NOTIFICATION_TITLE)
        .body(NOTIFICATION_BODY)
        .show()
    {
        Ok(()) => {
            println!("[shell] notify_turn_end");
            true
        }
        Err(error) => {
            println!("[shell] notify_turn_end failed: {error}");
            false
        }
    }
}

/// Pass a drop's paths to the page, and log it (M5.2).
///
/// With Tauri's drag-drop enabled the webview never sees a `DataTransfer` carrying a
/// Finder path, so the shell is what tells the composer what landed; the page turns
/// the paths into attachments through M2.5's own path.
pub fn handle_drop<R: Runtime>(app: &AppHandle<R>, event: &tauri::DragDropEvent) {
    if let tauri::DragDropEvent::Drop { paths, .. } = event {
        println!("[shell] drop {} file(s)", paths.len());
        let paths: Vec<String> = paths
            .iter()
            .map(|path| path.to_string_lossy().into_owned())
            .collect();
        let _ = app.emit_to(crate::MAIN_WINDOW_LABEL, FILES_DROPPED_EVENT, paths);
    }
}
