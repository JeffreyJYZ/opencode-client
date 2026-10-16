//! Which URLs may leave the app — decided in **one** place (M5.2).
//!
//! The frontend already tells "a link that leaves the app" from "a link that stays"
//! (`src/components/transcript/externalLink.ts`), but the shell is the boundary: it
//! is what actually hands a string to the OS browser, so the scheme allowlist lives
//! here and a refusal is logged rather than silently dropped. A link that is not
//! allowed simply leaves the app where it is — the navigation guard never moved it.

/// The schemes a link may use to leave the app: the web and mail.
///
/// **Kept in step with `EXTERNAL_SCHEMES` in `src/constants/markdown.ts`** — the TS
/// constant is what decides which clicks are raised at all, and `tests.rs` reads
/// that file and fails the build if the two lists ever differ.
pub const OPENABLE_SCHEMES: [&str; 3] = ["http", "https", "mailto"];

/// The Help menu's two links (M5.2). The repository has no remote yet, so the issue
/// tracker names the same placeholder host the updater's endpoint does; both are
/// real URLs, so the items are performable rather than decorative.
pub const DOCS_URL: &str = "https://opencode.ai/docs";
pub const ISSUES_URL: &str = "https://github.com/jyz/opencode-client/issues";

/// Whether `url` is one the shell may hand to the OS browser.
///
/// A parse failure is a refusal: an empty string, a bare fragment and a string that
/// is not a URL at all all answer `false`, so a caller cannot smuggle something
/// through by making it unparseable.
pub fn is_openable_url(url: &str) -> bool {
    let Ok(parsed) = tauri::Url::parse(url.trim()) else {
        return false;
    };
    OPENABLE_SCHEMES.contains(&parsed.scheme())
}
