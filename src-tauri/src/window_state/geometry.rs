//! Window geometry as rectangles: a frame, its chrome, a display's work area, and
//! the arithmetic that keeps one frame inside one area.
//!
//! Nothing here touches a window. Every function is pure, over rectangles, which
//! is what makes the clamp's behaviour testable without a display attached — the
//! shapes the tests feed it are the shapes real monitors report.

use std::fmt;

/// The first-run width, before any state has been persisted.
pub const WINDOW_WIDTH: f64 = 1280.0;
/// The first-run height.
pub const WINDOW_HEIGHT: f64 = 800.0;
/// The narrowest the content may be squeezed to.
pub const WINDOW_MIN_WIDTH: u32 = 800;
/// The shortest the content may be squeezed to.
pub const WINDOW_MIN_HEIGHT: u32 = 500;

/// The chrome the platform draws around the content, in physical pixels: the
/// title bar is chrome, the webview is not. Measured per window rather than
/// assumed — it is zero on a borderless window and ~28 px on a titled one.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Chrome {
    pub width: u32,
    pub height: u32,
}

/// An **outer** rectangle in physical pixels: where the window frame sits and how
/// big it is, chrome included. Monitor work areas are described this way too.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Rect {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

impl fmt::Display for Rect {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}x{}+{}+{}", self.width, self.height, self.x, self.y)
    }
}

/// The first work area `frame` overlaps most, so a window keeps the display it
/// was on; when it overlaps none of them the first area wins, and the caller puts
/// the primary monitor's first so that home is defined.
pub fn best_area(frame: Rect, areas: &[Rect]) -> Rect {
    let mut best = areas[0];
    let mut best_overlap = 0;
    for area in areas {
        let overlap = overlap(frame, *area);
        if overlap > best_overlap {
            best_overlap = overlap;
            best = *area;
        }
    }
    best
}

/// The pixel area two rectangles share; zero when they only touch, which is what
/// keeps a window straddling a seam assigned to the display it is mostly on.
fn overlap(a: Rect, b: Rect) -> u64 {
    let width = (a.x + a.width as i32).min(b.x + b.width as i32) - a.x.max(b.x);
    let height = (a.y + a.height as i32).min(b.y + b.height as i32) - a.y.max(b.y);
    if width > 0 && height > 0 {
        width as u64 * height as u64
    } else {
        0
    }
}

/// `frame` moved inside `area` and shrunk to fit it, never narrower than the
/// content floor its chrome makes room for. A display smaller than the floor wins
/// over the floor: a window that cannot fit is not made to overflow.
///
/// Idempotent: fitting an already-fitted frame changes nothing, so running the
/// clamp on a window that never left its display is a no-op.
pub fn fit(frame: Rect, area: Rect, chrome: Chrome) -> Rect {
    let min_width = WINDOW_MIN_WIDTH + chrome.width;
    let min_height = WINDOW_MIN_HEIGHT + chrome.height;
    let width = frame.width.min(area.width).max(min_width.min(area.width));
    let height = frame
        .height
        .min(area.height)
        .max(min_height.min(area.height));
    let right = area.x + area.width as i32 - width as i32;
    let bottom = area.y + area.height as i32 - height as i32;
    Rect {
        x: frame.x.clamp(area.x, right.max(area.x)),
        y: frame.y.clamp(area.y, bottom.max(area.y)),
        width,
        height,
    }
}

#[cfg(test)]
mod tests;
