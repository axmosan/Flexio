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
  /** Relative to Flexio data root, e.g. "Scripts/AfterEffects/SolidCreator/code/SolidCreator.jsx" */
  scriptPath: string
  /** Relative to Flexio data root, e.g. "Scripts/AfterEffects/SolidCreator/icon/icon.png" */
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

// ─── Global UI settings ──────────────────────────────────────────────────────
export interface GlobalSettings {
  /** Button size in px (32–128) */
  buttonScale: number
  /** Gap between buttons in px (0–32) */
  buttonSpacing: number
}

// ─── Root data structure (flexio-blueprints.json) ────────────────────────────
export interface BlueprintsData {
  version: string
  lastModified: string
  allocation: Record<AppName, AllocationMap>
  settings: GlobalSettings
  apps: Record<AppName, AppData>
}

// ─── .flex import conflict resolution ───────────────────────────────────────
export type ConflictMode = 'replace' | 'updateAdd' | 'addMissing' | 'cancel'

export interface ConflictInfo {
  existingNames: string[]
  incomingNames: string[]
  overlapping: string[]
}
