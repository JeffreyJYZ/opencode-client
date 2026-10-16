//! Which display a frame belongs to, and the overlap the choice is made on.

use super::super::{Rect, best_area, overlap};
use super::LAPTOP;

#[test]
fn the_area_a_frame_is_mostly_on_wins() {
    let right = Rect {
        x: 2940,
        y: 66,
        width: 2940,
        height: 1676,
    };
    // Wholly on the laptop.
    let on_laptop = Rect {
        x: 100,
        y: 100,
        width: 1280,
        height: 800,
    };
    assert_eq!(best_area(on_laptop, &[LAPTOP, right]), LAPTOP);
    // Straddling the seam at 2940: 212 px left, 1068 px right.
    let straddling = Rect {
        x: 2728,
        y: 100,
        width: 1280,
        height: 800,
    };
    assert_eq!(best_area(straddling, &[LAPTOP, right]), right);
    // The same frame wholly on the laptop: none of it reaches the seam.
    let mostly_left = Rect {
        x: 200,
        y: 100,
        width: 1280,
        height: 800,
    };
    assert_eq!(best_area(mostly_left, &[LAPTOP, right]), LAPTOP);
}

#[test]
fn a_frame_on_no_display_at_all_falls_back_to_the_first_area() {
    let gone = Rect {
        x: -9000,
        y: -9000,
        width: 1280,
        height: 800,
    };
    assert_eq!(best_area(gone, &[LAPTOP]), LAPTOP);
}

#[test]
fn rectangles_that_only_touch_do_not_overlap() {
    let a = Rect {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
    };
    let touching = Rect {
        x: 100,
        y: 0,
        width: 100,
        height: 100,
    };
    assert_eq!(overlap(a, touching), 0);
    assert_eq!(overlap(a, a), 10_000);
}
