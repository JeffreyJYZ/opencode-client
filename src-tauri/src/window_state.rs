//! Window geometry: the first-run size, the floor, and the restore clamp.
//!
//! `tauri-plugin-window-state` persists the size and position and restores them
//! when the window is created — but blindly: `restore_state` applies the saved
//! size whatever the display now is, and skips the saved position only when no
//! monitor *intersects* it. A window saved on a display that is now gone, or
//! saved larger than the display it comes back on, is therefore restored
//! off-screen or hanging over an edge.
//!
//! So the shell clamps **on read**: the shell performs the restore itself —
//! the plugin's own initial restore is skipped (`Builder::skip_initial_state`),
//! because Tauri *queues* that handler on the main thread and it lands after the
//! window has been built — and [`restore_on_screen`] then reads the geometry back
//! and moves and shrinks the window until the whole frame, chrome included, sits
//! inside one monitor's work area. Because it reads rather than predicts, it is
//! correct whatever the plugin (or the OS) decided to restore.
//!
//! It must be called from the restore's own `Moved`/`Resized` event rather than
//! right after the restore was asked for: macOS applies the frame on a later
//! run-loop turn, so a read before that still sees the freshly built window.
//!
//! The arithmetic itself lives next door in [`geometry`], which touches no window.

use tauri::{Monitor, PhysicalPosition, PhysicalSize, Runtime, WebviewWindow};

mod geometry;

pub use geometry::{
    Chrome, Rect, WINDOW_HEIGHT, WINDOW_MIN_HEIGHT, WINDOW_MIN_WIDTH, WINDOW_WIDTH,
};

use geometry::{best_area, fit};

/// What the restore read, and what the clamp left behind. Equal rectangles mean
/// the window came back where it went away, which is the common case.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Restored {
    pub before: Rect,
    pub after: Rect,
    pub chrome: Chrome,
}

/// Every monitor's work area, the primary display's first.
fn work_areas<R: Runtime>(window: &WebviewWindow<R>) -> tauri::Result<Vec<Rect>> {
    let mut areas: Vec<Rect> = Vec::new();
    if let Some(primary) = window.primary_monitor()? {
        areas.push(work_area_of(&primary));
    }
    for monitor in window.available_monitors()? {
        let area = work_area_of(&monitor);
        // A mirrored display has the same work area; one entry is enough and it
        // keeps the fallback order stable.
        if !areas.contains(&area) {
            areas.push(area);
        }
    }
    Ok(areas)
}

/// A monitor's work area — the display minus the menu bar and the dock — as a
/// rectangle. The work area is what the window must fit in; the display's own
/// bounds would put it back under the menu bar.
fn work_area_of(monitor: &Monitor) -> Rect {
    let work = monitor.work_area();
    Rect {
        x: work.position.x,
        y: work.position.y,
        width: work.size.width,
        height: work.size.height,
    }
}

/// Read the geometry the window was restored with, clamp it, and apply.
///
/// Returns what was read and what was left, so the caller can say which of the
/// two happened. Only a clamp that changes something is applied: an unchanged
/// window is never re-positioned, which would cost a round trip and could fight
/// the platform's own placement.
pub fn restore_on_screen<R: Runtime>(window: &WebviewWindow<R>) -> tauri::Result<Restored> {
    let position = window.outer_position()?;
    let outer = window.outer_size()?;
    let inner = window.inner_size()?;
    let chrome = Chrome {
        width: outer.width.saturating_sub(inner.width),
        height: outer.height.saturating_sub(inner.height),
    };
    let before = Rect {
        x: position.x,
        y: position.y,
        width: outer.width,
        height: outer.height,
    };
    let areas = work_areas(window)?;
    // With no monitor reported there is nothing to clamp against, and the
    // platform's own placement is all there is to trust.
    if areas.is_empty() {
        return Ok(Restored {
            before,
            after: before,
            chrome,
        });
    }
    let after = fit(before, best_area(before, &areas), chrome);
    if after != before {
        window.set_size(PhysicalSize::new(
            after.width.saturating_sub(chrome.width),
            after.height.saturating_sub(chrome.height),
        ))?;
        window.set_position(PhysicalPosition::new(after.x, after.y))?;
    }
    Ok(Restored {
        before,
        after,
        chrome,
    })
}

/// Say what the restore read and what the clamp left, on one line — the shell's
/// only evidence that the window came back where it went away, or that the clamp
/// had to move it.
pub fn report(restored: tauri::Result<Restored>) {
    match restored {
        Ok(restored) => println!(
            "[shell] window {} -> {} (chrome {}x{})",
            restored.before, restored.after, restored.chrome.width, restored.chrome.height
        ),
        Err(error) => println!("[shell] window geometry unreadable: {error}"),
    }
}
