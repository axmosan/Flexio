// ─── App identifiers ────────────────────────────────────────────────────────
export type AppName = 'AfterEffects' | 'PremierePro' | 'Illustrator' | 'Photoshop'

export const APP_NAMES: AppName[] = ['AfterEffects', 'PremierePro', 'Illustrator', 'Photoshop']

export const APP_DISPLAY_NAMES: Record<AppName, string> = {
  AfterEffects: 'After Effects',
  PremierePro: 'Premiere Pro',
  Illustrator: 'Illustrator',
  Photoshop: 'Photoshop',
}

// CEP host app name → AppName mapping
export const HOST_APP_MAP: Record<string, AppName> = {
  AEFT: 'AfterEffects',
  PPRO: 'PremierePro',
  ILST: 'Illustrator',
  PHXS: 'Photoshop',
}

// ─── Panel slots ─────────────────────────────────────────────────────────────
export type PanelSlot = 'panel1' | 'panel2' | 'panel3' | 'panel4'
export const PANEL_SLOTS: PanelSlot[] = ['panel1', 'panel2', 'panel3', 'panel4']

// ─── Button definition ───────────────────────────────────────────────────────
export type IconType = 'image' | 'text'

export interface ButtonDef {
  id: string
  name: string
  description: string
  /** Relative to Flexio data root, e.g. "Scripts/AfterEffects/<buttonId>/code/Sample.jsx" */
  scriptPath: string
  /** Relative to Flexio data root, e.g. "Scripts/AfterEffects/<buttonId>/icon/icon.png" */
  iconPath: string
  iconType: IconType
  /** Up to 6 chars displayed when iconType === 'text' */
  autoIconText: string
  order: number
}

// ─── Toolset definition ──────────────────────────────────────────────────────
export interface ToolsetDef {
  id: string
  name: string
  buttons: ButtonDef[]
}

// ─── Per-app data ────────────────────────────────────────────────────────────
export interface AppData {
  toolsets: ToolsetDef[]
}

// ─── Panel allocation ────────────────────────────────────────────────────────
/** Maps each panel slot to a toolset ID (or '' if unassigned) */
export type AllocationMap = Record<PanelSlot, string>

// ─── UI display mode ─────────────────────────────────────────────────────────
/** 'icon' = grid of square buttons, 'icon+name' = list with icon+label, 'name' = text-only list */
export type UIMode = 'icon' | 'icon+name' | 'name'

// ─── Per-panel settings (per-slot, not per-app) ──────────────────────────────
export interface PanelSettings {
  /** Scale in px: button size for icon mode, row/font scale for list modes (32–128) */
  scale: number
  /** Gap between buttons/rows in px (0–32) */
  spacing: number
  /** Allow drag-to-reorder */
  flipToReorder: boolean
  /** Display mode */
  uiMode: UIMode
  /** Column count: 0 = AUTO, 1–9 = fixed. Only applies when uiMode === 'icon' */
  columns: number
}

export type PanelSettingsMap = Record<PanelSlot, PanelSettings>

// ─── Root data structure (flexio-blueprints.json) ────────────────────────────
export interface BlueprintsData {
  version: string
  lastModified: string
  /** Per-app, per-slot toolset assignment */
  allocation: Record<AppName, AllocationMap>
  /** Per-slot visual settings (independent of which app is running) */
  panelSettings: PanelSettingsMap
  apps: Record<AppName, AppData>
}

// ─── .flex import conflict resolution ───────────────────────────────────────
export type ConflictMode = 'replace' | 'updateAdd' | 'addMissing' | 'cancel'

export interface ConflictInfo {
  existingNames: string[]
  incomingNames: string[]
  overlapping: string[]
}
