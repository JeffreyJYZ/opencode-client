# Vendored theme documents

Source: `/Users/jyz/dev/monorepos/opencode` (read-only upstream mirror),
`packages/tui/src/theme/assets/v2/opencode.json`.

Upstream commit at copy time: `eefe85d2572363b62d131128bd4bdb70294632ac`.

Why vendored: the app takes its palette and light/dark variants from the
opencode TUI theme document so colours are never hand-picked; the document is
the source/token authority.

Byte-identity check:

    cmp src/theme/vendor/opencode.json /Users/jyz/dev/monorepos/opencode/packages/tui/src/theme/assets/v2/opencode.json
    shasum -a 256 src/theme/vendor/opencode.json
    shasum -a 256 /Users/jyz/dev/monorepos/opencode/packages/tui/src/theme/assets/v2/opencode.json

Both must be silent / equal. The copy is byte-identical; provenance lives here,
not in the JSON (JSON has no comments). This path is excluded from Biome and
from the 150-line gate because it is a byte-identical vendored copy.
