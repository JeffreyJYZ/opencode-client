# 030 — Typography, tokens and themes

The sketch: "font should be mainly a font fit for ui, not a mono font, and font should be customisable."

## Two font roles

| Role | Applies to | Default |
| --- | --- | --- |
| **interface** (proportional) | prose, labels, buttons, menus, tabs, sidebar, settings | bundled **Geist** variable (OFL, `~/dev/fonts/geist/Geist-VariableFont_wght.ttf`), family `Geist` |
| **code** (mono) | fenced code, inline code, tool call anchors and output, diffs, shell output, terminal | **`GeistMono Nerd Font`** — installed by the brew cask `font-geist-mono-nerd-font` (3.5.1 on this machine) into `~/Library/Fonts/GeistMonoNerdFont-*.otf`; **offered by family name, no asset bundled**. Fallback when it is absent: bundled **`Geist Mono`** variable (OFL, `~/dev/fonts/geist-mono/`) |

- Fallbacks: interface `Geist, system-ui, -apple-system, "Segoe UI", sans-serif`; code `"GeistMono Nerd Font", "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace`.
- The bloat is **bundled, the default is installed**: Geist and Geist Mono are committed (OFL) so a build resolves an offline machine, but the shipped code face is the machine's **Nerd Font** cut, which a distribution cannot carry (its glyph set is large and the cask owns the updates). A missing Nerd Font falls back to the bundled `Geist Mono` — never to a serif or a proportional face.
- Why the Nerd Font cut: it carries the box-drawing, powerline and icon glyphs the TUI vocabulary leans on (`│ ╹ ▀ ↳ ✓`), so a tool row or a rail never falls back to a different face mid-line. The plain `Geist Mono` variable cut lacks most of them.
- Mono is never the default for anything else. A row's prose, its status word and its durations are proportional; only the *content* a tool produced is mono.

## How a font is applied

- The root carries exactly two custom properties, `--oc-font-ui` (family stack) and `--oc-font-code`, plus `--oc-font-ui-size` and `--oc-font-code-size`. Nothing writes a font family or size literal in a component.
- `initializeFonts()` reads the stored preference once at startup and writes those variables; applying a change in settings writes them again and re-renders. No component measures a glyph.
- **No cell grid.** Layout is CSS: no measured advance, no `ch`-based panes, no glyph-drawn borders, no cell-snapped scroll. `ch` may appear only inside a mono surface where a character-width unit is genuinely wanted.
- Sizes: interface default **15px**, code default **13px**, both settable in a bounded range (interface 12–20, code 11–18) with a reset. Line height is a token (`--oc-leading`) so density is one value, not a per-component guess.
- Weight: interface sections use the variable face's weights (400/500/600); no synthetic bold.

## Face picker

- Options: the bundled webfaces, the machine's own families **by the name the webview resolves** (never guessed from a file name), and the CSS generics (`system-ui`, `ui-sans-serif`, `ui-monospace`, `ui-rounded`, `monospace`).
- The Nerd Font cask installs three families whose names do **not** match their file names — `GeistMonoNerdFont-*.otf` is `GeistMono Nerd Font`, `GeistMonoNerdFontMono-*.otf` is `GeistMono Nerd Font Mono` (strictly single-width glyphs — the cut a terminal surface wants), `GeistMonoNerdFontPropo-*.otf` is `GeistMono Nerd Font Propo` (proportional). All three are offered, by those exact names; `GeistMono Nerd Font` is the default.
- The cask also registers short aliases (`GeistMono NF`, `GeistMono NFM`, `GeistMono NFP`) and Spotlight reports the alias as the family. The picker uses the canonical long name and accepts the alias as a match, so a user who knows either finds it.
- A family installed on the machine resolves by `font-family` with no asset; the system stack is the legitimate way to reach SF, whose licence forbids self-hosting as a webfont. Never bundle or embed an Apple face.
- `document.fonts.check()` is **not** decisive — it returns true for a misspelt family. Prove a candidate by measuring the `"0"` advance against a known fallback and rendering a sample offscreen; a family that does not differ is not offered as bundled.
- Each picker entry shows a live sample line in that face, and the code picker adds a sample with a ligature-bearing snippet and a box-drawing row (so a face that cannot draw `│ ╹ ▀` is visible before it is chosen).

## Tokens

Three layers in one place (`src/theme/tokens.css`), never a raw hex in a component:

1. **Primitive** — the palette: `--oc-num-*` hue scales taken from the vendored opencode theme documents.
2. **Semantic** — what the app means: `--oc-surface`, `--oc-surface-raised`, `--oc-surface-raised-high` (the prompt box), `--oc-text`, `--oc-text-muted`, `--oc-border`, `--oc-accent`, `--oc-danger`, `--oc-warn`, `--oc-focus`.
3. **Component** — a component's own token when it must differ (`--oc-prompt-rail`, `--oc-band-surface`), each defined in terms of level 2.

- The palette is **not invented**: the vendored opencode theme **document** is copied byte-identical from the mirror — `packages/tui/src/theme/assets/v2/opencode.json`, the `base`/`light`/`dark` document the TUI itself resolves (`packages/theme/src/tui/*` is the TypeScript that *reads* those documents, not the documents) — into `src/theme/vendor/opencode.json`, excluded from Biome and from the length gate. `cmp` is silent and the sha256 matches. **JSON takes no comment**, so provenance lives in `src/theme/vendor/README.md` rather than in the file (M0.3 decided this; the earlier wording asked for both). A v2 document defines its scales *per mode*, so `primitive.css` redefines every hue inside its own theme block and the semantic layer can name one token in both.
- Non-colour tokens: `--oc-radius` (4px controls, 6px panels), `--oc-hairline` (1px), the spacing scale, `--oc-motion` (respecting `prefers-reduced-motion`).
- **Dark first, light supported**: both variants are defined for every semantic token; the theme's light mode comes from the same vendored documents, so no value is hand-picked.

## Theme service

- One service owns theming: it writes a single `<style>` element and one `data-theme` marker on the root, and it is the only writer of the theme variables.
- A theme is `{ id, name, variables, css? }`; the built-in dark/light pair are themes in the same registry a plugin registers into.
- Applying a theme is idempotent and reversible: clearing restores the built-in pair. A plugin theme cannot override the **font** variables — user font settings win, so a theme can never make the UI unreadable.
- The vendored documents are the source; a theme's variables are read out of them, not re-typed.

## Acceptance

- A fresh install renders the whole UI in Geist (proportional) and code in `GeistMono Nerd Font` where the cask is installed, in bundled `Geist Mono` where it is not; the system stacks are the last resort on both roles.
- Code surfaces never fall back to a proportional or serif face: uninstall the Nerd Font and every code block, tool output and diff still renders in `Geist Mono`.
- Changing the interface family, code family, either size, or the theme applies live, survives a restart, and is visible in every surface (home, session, settings, plugin-contributed UI).
- A misspelt family is refused by the picker rather than silently falling back; a machine family that exists is offered by name.
- Both light and dark render with every semantic token defined; no component reaches past the semantic layer for a raw colour.
- No layout in the app depends on a glyph's advance: the UI survives a proportional face and a mono face at the same window size with no overlap or clipping.
