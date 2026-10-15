//! The desktop shell: one window, built in Rust so it can carry the target handover.

mod target;

use tauri::{WebviewUrl, WebviewWindowBuilder};

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
            .min_inner_size(WINDOW_MIN_WIDTH, WINDOW_MIN_HEIGHT);

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
