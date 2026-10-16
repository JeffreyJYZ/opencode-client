//! The menu's action surface: the ids, labels and chords, and the id ↔ action
//! pair the page's half of the seam is matched against.

/// What the menu can perform.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Action {
    NewSession,
    CloseTab,
    ToggleSidebar,
    CommandPalette,
    Reload,
}

/// Every action, in menu order — what `Action::from_id` searches, so an id added
/// to one half of the pair cannot be missing from the other.
const ALL: [Action; 5] = [
    Action::NewSession,
    Action::CloseTab,
    Action::ToggleSidebar,
    Action::CommandPalette,
    Action::Reload,
];

impl Action {
    /// The item's id and the payload the page receives. Written here and in
    /// `src/constants/menu.ts`; the pair is the seam, so the two must stay in step
    /// — a test asserts the id round-trips to the action that produced it.
    pub fn id(self) -> &'static str {
        match self {
            Self::NewSession => "file.new-session",
            Self::CloseTab => "file.close-tab",
            Self::ToggleSidebar => "view.toggle-sidebar",
            Self::CommandPalette => "view.command-palette",
            Self::Reload => "view.reload",
        }
    }

    /// What the item reads.
    pub(super) fn label(self) -> &'static str {
        match self {
            Self::NewSession => "New session…",
            Self::CloseTab => "Close tab",
            Self::ToggleSidebar => "Toggle sidebar",
            Self::CommandPalette => "Command palette",
            Self::Reload => "Reload",
        }
    }

    /// The chord the item shows. Kept in step with the map in
    /// `src/constants/keys.ts`, which is what the page matches keydowns against.
    pub(super) fn accelerator(self) -> &'static str {
        match self {
            Self::NewSession => "CmdOrCtrl+T",
            Self::CloseTab => "CmdOrCtrl+W",
            Self::ToggleSidebar => "CmdOrCtrl+B",
            Self::CommandPalette => "CmdOrCtrl+K",
            Self::Reload => "CmdOrCtrl+R",
        }
    }

    /// The action an id names, or `None` for an id the shell does not own.
    pub fn from_id(id: &str) -> Option<Self> {
        ALL.into_iter().find(|action| action.id() == id)
    }

    /// Whether the shell performs this action itself rather than handing it to
    /// the page.
    pub fn is_native(self) -> bool {
        matches!(self, Self::Reload)
    }
}
