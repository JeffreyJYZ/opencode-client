//! The desktop shell: one window, built in Rust so it can carry the target handover.

mod target;

#[cfg(test)]
mod tests;

use tauri::{Url, WebviewUrl, WebviewWindowBuilder};

/// The window label the capabilities and the frontend address.
const MAIN_WINDOW_LABEL: &str = "main";
/// The window title. Spec 010 gives a session route its own title later.
const WINDOW_TITLE: &str = "opencode client";
/// The first-run size; `tauri-plugin-window-state` restores later launches.
const WINDOW_WIDTH: f64 = 1280.0;
/// The first-run height.
const WINDOW_HEIGHT: f64 = 800.0;
/// The smallest width the layout may be squeezed to.
const WINDOW_MIN_WIDTH: f64 = 800.0;
/// The smallest height the layout may be squeezed to.
const WINDOW_MIN_HEIGHT: f64 = 500.0;
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
fn is_allowed_navigation(url: &Url, dev: bool) -> bool {
    match url.scheme() {
        APP_SCHEME => true,
        DEV_SCHEME => dev && url.host_str() == Some(DEV_HOST) && url.port() == Some(DEV_PORT),
        _ => false,
    }
}

/// Runs the shell. Called from `main.rs`.
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            let target = target::resolve();
            match &target {
                Some(target) => println!("[shell] target {}", target.redacted()),
                None => println!("[shell] no target; the page falls back to its own origin"),
            }

            let mut window = WebviewWindowBuilder::new(
                app,
                MAIN_WINDOW_LABEL,
                WebviewUrl::App("index.html".into()),
            )
            .title(WINDOW_TITLE)
            .inner_size(WINDOW_WIDTH, WINDOW_HEIGHT)
            .min_inner_size(WINDOW_MIN_WIDTH, WINDOW_MIN_HEIGHT)
            // The guard: the init script below re-runs on every main-frame load.
            .on_navigation(|url| is_allowed_navigation(url, cfg!(dev)));

            // The handover has to exist before the page's first script runs, which is
            // why the window is built here rather than declared in `tauri.conf.json`:
            // only this builder carries an initialization script.
            if let Some(target) = &target {
                window = window.initialization_script(target.initialization_script());
            }

            window.build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("the opencode client shell failed to run");
}
