/**
 * The sidebar panel's stable DOM handle (M2.21): the `data-*` attribute carrying
 * the panel's registry id. Selected by id, never by the human title — titles are
 * copy, ids are identity. Named once here; `SidebarPanel` renders it and the
 * statusline's reveal reads it.
 */

/** The attribute on every sidebar panel's section holding its registry id. */
export const PANEL_ID_ATTRIBUTE = "data-panel-id" as const;
