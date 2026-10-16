//! Fitting a frame inside a work area: the move, the shrink, and the floor.

use super::super::{Rect, WINDOW_MIN_HEIGHT, WINDOW_MIN_WIDTH, fit};
use super::{CHROME, LAPTOP};

#[test]
fn a_frame_that_never_left_its_display_is_untouched() {
    let frame = Rect {
        x: 100,
        y: 80,
        width: 1280,
        height: 800,
    };
    assert_eq!(fit(frame, LAPTOP, CHROME), frame);
}

#[test]
fn a_frame_saved_on_a_larger_display_is_shrunk_and_moved_back() {
    // Saved on a 5K display, returning on the laptop.
    let frame = Rect {
        x: 3000,
        y: 1900,
        width: 2560,
        height: 1400,
    };
    assert_eq!(
        fit(frame, LAPTOP, CHROME),
        Rect {
            x: 0,
            y: 25,
            width: LAPTOP.width,
            height: LAPTOP.height,
        }
    );
}

#[test]
fn a_frame_hanging_off_the_right_edge_is_pulled_back_inside() {
    let frame = Rect {
        x: 1200,
        y: 100,
        width: 1280,
        height: 800,
    };
    assert_eq!(
        fit(frame, LAPTOP, CHROME),
        Rect {
            x: LAPTOP.width as i32 - 1280,
            y: 100,
            width: 1280,
            height: 800,
        }
    );
}

#[test]
fn a_frame_above_the_menu_bar_is_pushed_below_it() {
    let frame = Rect {
        x: 40,
        y: -300,
        width: 1280,
        height: 800,
    };
    assert_eq!(fit(frame, LAPTOP, CHROME).y, LAPTOP.y);
}

#[test]
fn the_floor_holds_where_the_display_can_hold_it() {
    let tiny = Rect {
        x: 10,
        y: 30,
        width: 200,
        height: 100,
    };
    let fitted = fit(tiny, LAPTOP, CHROME);
    assert_eq!(fitted.width, WINDOW_MIN_WIDTH);
    assert_eq!(fitted.height, WINDOW_MIN_HEIGHT + CHROME.height);
}

#[test]
fn a_display_smaller_than_the_floor_wins_over_it() {
    let netbook = Rect {
        x: 0,
        y: 25,
        width: 640,
        height: 400,
    };
    let frame = Rect {
        x: 0,
        y: 0,
        width: 1280,
        height: 800,
    };
    assert_eq!(fit(frame, netbook, CHROME), netbook);
}

#[test]
fn a_display_left_of_the_primary_keeps_its_negative_origin() {
    let left = Rect {
        x: -1920,
        y: 0,
        width: 1920,
        height: 1080,
    };
    // Already wholly inside the left display.
    let inside = Rect {
        x: -1800,
        y: 40,
        width: 1280,
        height: 800,
    };
    assert_eq!(fit(inside, left, CHROME), inside);
    // Straddling the seam at 0, and clamped against the left display alone it is
    // pulled fully onto it: its right edge lands on the seam.
    let straddling = Rect {
        x: -100,
        y: 40,
        width: 1280,
        height: 800,
    };
    let pulled = fit(straddling, left, CHROME);
    assert_eq!(pulled.x, left.x + left.width as i32 - 1280);
    assert_eq!(pulled.width, 1280);
}

#[test]
fn fitting_an_already_fitted_frame_changes_nothing() {
    let frame = Rect {
        x: 9000,
        y: 9000,
        width: 2560,
        height: 1400,
    };
    let once = fit(frame, LAPTOP, CHROME);
    assert_eq!(fit(once, LAPTOP, CHROME), once);
}
