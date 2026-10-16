//! The app menu: what the OS menu bar offers, and what each item does.
//!
//! Every item here does something. The four the page can perform are raised as one
//! window event ([`MENU_EVENT`]) carrying the action's id; the page answers them
//! from the same action surface its chords use, so no command is reachable *only*
//! from the menu (spec 010 §Window). Quit is the platform's own — its predefined
//! item is what makes ⌘Q work at all — and Reload is the shell's own, because a
//! reload that depends on the page's script still running is useless in exactly
//! the case one reaches for it.
//!
//! The Help submenu the spec names (Docs, Report issue) is here now that M5.2 wired
//! the shell's URL opener: both items hand a url to `native::open_url`, the one
//! place that decides what may leave the app. They are deliberately **not** members
//! of [`Action`] — an action is raised for the page, and these never are.

use tauri::menu::{
    AboutMetadata, IsMenuItem, Menu, MenuBuilder, MenuItem, MenuItemBuilder, SubmenuBuilder,
};
use tauri::{AppHandle, Emitter, Manager, Runtime};

use crate::native::links;
use crate::version::{PACKAGE_JSON, version_from_json};

mod action;

pub use action::Action;

/// The window event a menu item raises for the page: one event, the action's id
/// as its payload. Matched by `MENU_ACTION` in `src/constants/menu.ts`.
pub const MENU_EVENT: &str = "oc:menu";

/// Reloading the window is the shell's job: a wedged page cannot answer.
const RELOAD_JS: &str = "window.location.reload();";

/// The Help submenu's two ids and their urls. Neither is an [`Action`]: the shell
/// performs them itself, and the page never sees them.
const HELP_ITEMS: [(&str, &str, &str); 2] = [
    ("help.docs", "Docs", links::DOCS_URL),
    ("help.report-issue", "Report issue", links::ISSUES_URL),
];

/// Build the menu bar. The first submenu is the application menu macOS expects:
/// without it the system has nowhere to put Services, Hide or the About panel,
/// and the version would have no native place to be shown.
pub fn build<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let about = AboutMetadata {
        name: Some(crate::APP_NAME.to_owned()),
        version: version_from_json(PACKAGE_JSON),
        ..Default::default()
    };
    let application = SubmenuBuilder::new(app, crate::APP_NAME)
        .about(Some(about))
        .separator()
        .services()
        .separator()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?;
    let file = SubmenuBuilder::new(app, "File")
        .item(&item(app, Action::NewSession)?)
        .item(&item(app, Action::CloseTab)?)
        .separator()
        .quit()
        .build()?;
    let view = SubmenuBuilder::new(app, "View")
        .item(&item(app, Action::ToggleSidebar)?)
        .item(&item(app, Action::CommandPalette)?)
        .separator()
        .item(&item(app, Action::Reload)?)
        .build()?;
    let help = SubmenuBuilder::new(app, "Help")
        .item(&MenuItemBuilder::with_id(HELP_ITEMS[0].0, HELP_ITEMS[0].1).build(app)?)
        .item(&MenuItemBuilder::with_id(HELP_ITEMS[1].0, HELP_ITEMS[1].1).build(app)?)
        .build()?;
    let submenus: [&dyn IsMenuItem<R>; 4] = [&application, &file, &view, &help];
    MenuBuilder::new(app).items(&submenus).build()
}

/// One item, built from the action it performs.
fn item<R: Runtime>(app: &AppHandle<R>, action: Action) -> tauri::Result<MenuItem<R>> {
    MenuItemBuilder::with_id(action.id(), action.label())
        .accelerator(action.accelerator())
        .build(app)
}

/// Act on a menu item. `false` means the id was not this shell's, so the caller
/// can say so rather than swallowing it.
pub fn handle<R: Runtime>(app: &AppHandle<R>, id: &str) -> bool {
    if let Some((_, _, url)) = HELP_ITEMS.iter().find(|(item_id, _, _)| *item_id == id) {
        let _ = crate::native::open_url(app, url);
        return true;
    }
    let Some(action) = Action::from_id(id) else {
        return false;
    };
    if action.is_native() {
        if let Some(window) = app.get_webview_window(crate::MAIN_WINDOW_LABEL) {
            let _ = window.eval(RELOAD_JS);
        }
    } else {
        let _ = app.emit_to(crate::MAIN_WINDOW_LABEL, MENU_EVENT, action.id());
    }
    true
}

#[cfg(test)]
mod tests;
