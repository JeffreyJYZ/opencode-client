//! The clamp's arithmetic, with the shapes a real display set produces — split
//! by the two jobs `geometry` does: choosing the display a frame belongs to
//! ([`areas`]), and moving the frame inside it ([`fit`]).
//!
//! Every rectangle here is a work area a monitor really reports — a laptop
//! display with a menu bar (a `y` above zero), a second display to the left
//! (negative `x`), and a display smaller than the content floor.

use super::{Chrome, Rect};

mod areas;
mod fit;

/// A titled macOS window's chrome: the title bar, no side border.
pub(super) const CHROME: Chrome = Chrome {
    width: 0,
    height: 28,
};

/// A 16" laptop's work area with the menu bar and dock taken out — captured from
/// this machine, where `Monitor::work_area()` reports
/// `PhysicalRect { (0, 66), 2940x1676 }`: physical pixels, not points.
pub(super) const LAPTOP: Rect = Rect {
    x: 0,
    y: 66,
    width: 2940,
    height: 1676,
};
