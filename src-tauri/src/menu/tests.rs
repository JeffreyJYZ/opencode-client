//! The menu's id arithmetic — the half that can be wrong without the window
//! being open, and the promise that every item is performable.

use super::{
    Action,
    Action::{CloseTab, CommandPalette, NewSession, Reload, ToggleSidebar},
    MENU_EVENT,
};

const ALL: [Action; 5] = [NewSession, CloseTab, ToggleSidebar, CommandPalette, Reload];

#[test]
fn every_action_round_trips_through_its_id() {
    for action in ALL {
        assert_eq!(
            Action::from_id(action.id()),
            Some(action),
            "{} did not come back",
            action.id()
        );
    }
}

#[test]
fn the_ids_are_unique() {
    let mut ids: Vec<&str> = ALL.iter().map(|action| action.id()).collect();
    let count = ids.len();
    ids.sort_unstable();
    ids.dedup();
    assert_eq!(ids.len(), count, "two menu items share an id");
}

#[test]
fn every_id_is_namespaced_by_the_submenu_it_lives_in() {
    for action in ALL {
        let id = action.id();
        assert!(
            id.starts_with("file.") || id.starts_with("view."),
            "{id} names no submenu"
        );
    }
}

#[test]
fn every_item_has_a_label_and_a_chord() {
    for action in ALL {
        assert!(!action.label().is_empty(), "{} has no label", action.id());
        assert!(
            action.accelerator().starts_with("CmdOrCtrl+"),
            "{} has no chord",
            action.id()
        );
    }
}

#[test]
fn reload_is_the_only_action_the_shell_performs_itself() {
    for action in ALL {
        assert_eq!(action.is_native(), action == Reload, "{}", action.id());
    }
}

#[test]
fn an_id_this_shell_does_not_own_names_no_action() {
    assert_eq!(Action::from_id("help.docs"), None);
    assert_eq!(Action::from_id("file.quit"), None);
    assert_eq!(Action::from_id(""), None);
}

#[test]
fn the_help_items_are_the_shells_own_and_are_unique() {
    // M5.2's Help submenu: neither item is an `Action` (nothing is raised for the
    // page), so the id must not round-trip to one, and no two items may share an id
    // — `handle` finds an item by its id, so a duplicate would open the wrong link.
    let mut ids: Vec<&str> = super::HELP_ITEMS.iter().map(|(id, _, _)| *id).collect();
    for id in &ids {
        assert!(id.starts_with("help."), "{id} names no submenu");
        assert_eq!(Action::from_id(id), None, "{id} is an Action after all");
    }
    let count = ids.len();
    ids.sort_unstable();
    ids.dedup();
    assert_eq!(ids.len(), count, "two Help items share an id");
}

#[test]
fn every_help_item_names_a_url_the_opener_accepts() {
    for (id, _, url) in super::HELP_ITEMS {
        assert!(crate::native::is_openable_url(url), "{id} names {url}");
    }
}

#[test]
fn the_event_name_is_the_one_the_page_listens_for() {
    assert_eq!(MENU_EVENT, "oc:menu");
}
