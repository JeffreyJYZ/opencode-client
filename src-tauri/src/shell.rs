//! Creating the one window, and putting it back where it was.
//!
//! This is the part of `run()` that touches the window rather than wiring
//! plugins, and the clamp's timing is subtle enough to be worth its own file: the
//! frame the window-state plugin asks for settles on a **later run-loop turn**,
//! so the clamp cannot run in `setup` — it runs from the restore's own
//! `Moved`/`Resized` event, where the geometry is already the restored one.
//!
//! The window is built here rather than declared in `tauri.conf.json`
//! (`app.windows: []`) because only this builder carries an
//! `initialization_script`, which must exist before the page's first script runs:
//! that is the target handover, and the reason the policy is assembled here too.

use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{AppHandle, Runtime, WebviewUrl, WebviewWindow, WebviewWindowBuilder, WindowEvent};
use tauri_plugin_window_state::{StateFlags, WindowExt};

use crate::csp;
use crate::is_allowed_navigation;
use crate::target::Target;
use crate::window_state::{self, WINDOW_HEIGHT, WINDOW_MIN_HEIGHT, WINDOW_MIN_WIDTH, WINDOW_WIDTH};
use crate::{APP_NAME, MAIN_WINDOW_LABEL};

/// Build the main window, restore its saved geometry, and keep it on screen.
///
/// `is_allowed_navigation` is the guard the init script below makes necessary: a
/// script injected on every main-frame load may only ever run on this app's own
/// document. Dev-only residual risk, as in the guard: whatever owns
/// `localhost:1420` is trusted in a dev build, and `--strictPort` refuses a
/// substituted port.
pub fn open<R: Runtime>(
    app: &AppHandle<R>,
    target: Option<&Target>,
) -> tauri::Result<WebviewWindow<R>> {
    let window =
        WebviewWindowBuilder::new(app, MAIN_WINDOW_LABEL, WebviewUrl::App("index.html".into()))
            .title(APP_NAME)
            .inner_size(WINDOW_WIDTH, WINDOW_HEIGHT)
            .min_inner_size(WINDOW_MIN_WIDTH as f64, WINDOW_MIN_HEIGHT as f64)
            .on_navigation(|url| is_allowed_navigation(url, cfg!(dev)))
            .initialization_script(csp::initialization_script(target, cfg!(dev)))
            .build()?;

    // The state is restored **by hand**: the plugin's own initial restore is
    // skipped in `lib.rs`, because Tauri queues that handler on the main thread
    // and it lands after this function returns.
    window.restore_state(StateFlags::all())?;

    // `restore_state` asks for a frame, and macOS applies it on a later run-loop
    // turn: measured on this machine, the call returns with the window still
    // reporting the freshly built frame (2560x1600) while the restored one was
    // 2400x1500. The settled frame is announced as the restore's own
    // `Moved`/`Resized` event — where the geometry is already the restored one —
    // so that is where the clamp runs. Once: a later such event is the user
    // moving the window, which the clamp must not fight.
    let clamped = Arc::new(AtomicBool::new(false));
    let target_window = window.clone();
    window.on_window_event(move |event| {
        let settled = matches!(event, WindowEvent::Moved(_) | WindowEvent::Resized(_));
        if settled && !clamped.swap(true, Ordering::SeqCst) {
            window_state::report(window_state::restore_on_screen(&target_window));
        }
    });
    Ok(window)
}
