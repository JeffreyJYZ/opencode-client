//! The desktop shell: one window, built in Rust so it can carry the target handover.

mod csp;
mod menu;
mod native;
mod shell;
mod target;
mod updates;
mod version;
mod window_state;

#[cfg(test)]
mod tests;

use tauri::Url;

/// The name the app shows: the window title, the application menu and the About
/// panel. `tauri.conf.json`'s `productName` is the same string, so the menu a
/// macOS user sees names the app the same way the bundle does.
pub const APP_NAME: &str = "opencode client";

/// The window label the capabilities and the frontend address.
pub(crate) const MAIN_WINDOW_LABEL: &str = "main";

/// The scheme the production app is served from (`tauri://localhost`).
const APP_SCHEME: &str = "tauri";
/// The scheme the dev server serves the app over in a dev build.
const DEV_SCHEME: &str = "http";
/// The dev server's host. Kept in step with `devUrl` in `tauri.conf.json`.
const DEV_HOST: &str = "localhost";
/// The dev server's port. Kept in step with `devUrl` in `tauri.conf.json`.
const DEV_PORT: u16 = 1420;

/// Whether the webview may navigate to `url`.
///
/// The injected target is registered at document start on the main frame, so it
/// is re-injected on **every** top-level load. Only the app's own document may
/// therefore be navigated to: the production origin always, the dev server's
/// origin only in a dev build, where the app is served by Vite rather than from
/// the bundle. Everything else — an external link in rendered markdown, a
/// redirect, `window.location = …` — is refused, so no foreign origin can
/// receive `window.__OC_TARGET__`. External links opening in the OS browser is
/// a separate task; a refusal here must simply leave the app where it is.
///
/// Dev-only residual risk: in a dev build whatever owns `localhost:1420` is
/// trusted (`--strictPort` makes Vite fail on a busy port instead of
/// substituting, and this arm is compiled out of a production build), so this
/// cannot reach a released build.
fn is_allowed_navigation(url: &Url, dev: bool) -> bool {
    match url.scheme() {
        // The production arm checks the host deliberately. A foreign `tauri://`
        // authority such as `tauri://evil/index.html` is still served by this
        // app's own asset handler, so the document it would receive is our own
        // bundle, which already holds the credential: there is no live leak
        // here. The pin exists because the guard's contract is "this app's own
        // origin", and requiring `localhost` is the one condition that makes it
        // exact.
        APP_SCHEME => url.host_str() == Some("localhost"),
        DEV_SCHEME => dev && url.host_str() == Some(DEV_HOST) && url.port() == Some(DEV_PORT),
        _ => false,
    }
}

/// Runs the shell. Called from `main.rs`.
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        // The three native integrations (M5.2). The page reaches the clipboard
        // through the plugin's own JS half (`clipboard-manager:allow-write-text`);
        // the opener and the notification are driven from Rust only, so the page
        // holds no permission for them and cannot bypass `native::open_url`.
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_notification::init())
        // The window state is restored **by hand** in `setup` below, so the clamp
        // runs against exactly what the plugin applied instead of racing the
        // handler Tauri queues on the main thread for `on_window_ready` (which
        // runs *after* the window is built). Saving on exit is unchanged.
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .skip_initial_state(MAIN_WINDOW_LABEL)
                .build(),
        )
        // The updater reads its endpoints and public key from the
        // `plugins.updater` block of `tauri.conf.json`; the private key is never
        // in this repository (see `scripts/verify-release.ts`). Nothing calls it
        // yet — the page's settings section does, through
        // `src/updates/updater.ts`.
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let target = target::resolve();
            match &target {
                Some(target) => println!("[shell] target {}", target.redacted()),
                None => println!("[shell] no target; the page falls back to its own origin"),
            }

            // The menu is app-wide, so it is set before the window exists. Every
            // item either performs something here or is raised for the page; an
            // unowned id is reported rather than swallowed.
            let _previous = app.set_menu(menu::build(app.handle())?)?;
            app.on_menu_event(|app, event| {
                if !menu::handle(app, event.id().as_ref()) {
                    println!("[shell] no action for menu item {}", event.id().as_ref());
                }
            });
            println!("[shell] updates from {}", updates::UPDATE_ENDPOINT);

            // The window, the target handover and the restore clamp all live in
            // `shell`; it is where the geometry is read back and corrected.
            let _window = shell::open(app.handle(), target.as_ref())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            native::open_external,
            native::open_in_editor,
            native::notify_turn_end
        ])
        .run(tauri::generate_context!())
        .expect("the opencode client shell failed to run");
}

/// The id allowlist a manifest's `id` must satisfy — the Rust half of the one rule
/// in `PLUGIN_ID_PATTERN` (`src/plugins/manifest.ts`), spec 040 §Manifest: one path
/// component of `[A-Za-z0-9._-]` with no leading or trailing `.`. It is a plain
/// scan rather than a `regex` dependency, so the crate gains no dependency; the
/// shared corpus `src/plugins/plugin-id-cases.json` is what proves the two agree.
pub const PLUGIN_ID_PATTERN: &str = "^[A-Za-z0-9_-]([A-Za-z0-9._-]*[A-Za-z0-9_-])?$";

/// Whether `id` is a safe single path component. Every path the native bridge joins
/// under `plugin-data/<id>/` is checked with this: `plugin-data` is the one
/// capability of the consent list that is enforced for real (spec 040 §Capabilities),
/// and a `..` in an id is the reason `safe_id` exists at all.
pub fn safe_id(id: &str) -> bool {
    let bytes = id.as_bytes();
    if bytes.is_empty() {
        return false;
    }
    let allowed = |byte: u8| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-' | b'.');
    if !bytes.iter().all(|&byte| allowed(byte)) {
        return false;
    }
    bytes[0] != b'.' && bytes[bytes.len() - 1] != b'.'
}
