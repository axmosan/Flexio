/**
 * Flexio preset format (.json):
 *   Plain JSON containing blueprints config + script/icon files as Base64.
 *
 * Export: read blueprints + all Scripts/* files → encode Base64 → write JSON
 * Import: decode → restore files → merge blueprints → reload
 */
import { nfs, npath, ensureDir, listFilesRecursive } from './nodeEnv'
import { getFlexioRoot, getScriptsRoot, getBlueprintsPath } from './paths'
import { saveBlueprints, loadBlueprints } from './blueprints'
import type { BlueprintsData } from '../types'
import type { ConflictMode } from '../types'
import { APP_NAMES, PANEL_SLOTS } from '../types'

export interface FlexPreset {
  flexioPreset: true
  version: string
  exportedAt: string
  blueprints: BlueprintsData
  /** Relative path (from Flexio root) → Base64-encoded file content */
  scripts: Record<string, string>
}

// ─── Export ──────────────────────────────────────────────────────────────────

export async function exportFlex(destPath: string): Promise<void> {
  const root = getFlexioRoot()
  const blueprintsPath = getBlueprintsPath()
  const blueprints: BlueprintsData = nfs.existsSync(blueprintsPath)
    ? (JSON.parse(nfs.readFileSync(blueprintsPath, 'utf8')) as BlueprintsData)
    : ({} as BlueprintsData)

  const scripts: Record<string, string> = {}
  const scriptsRoot = getScriptsRoot()
  if (nfs.existsSync(scriptsRoot)) {
    for (const absPath of listFilesRecursive(scriptsRoot)) {
      const rel = npath.relative(root, absPath).replace(/\\/g, '/')
      const buf = nfs.readFileSync(absPath) as Buffer
      scripts[rel] = buf.toString('base64')
    }
  }

  const preset: FlexPreset = {
    flexioPreset: true,
    version: '2.0',
    exportedAt: new Date().toISOString(),
    blueprints,
    scripts,
  }

  ensureDir(npath.dirname(destPath))
  nfs.writeFileSync(destPath, JSON.stringify(preset, null, 2), 'utf8')
}

// ─── Preview (conflict detection) ────────────────────────────────────────────

export interface ImportPreview {
  incomingNames: string[]
  existingNames: string[]
  overlapping: string[]
}

export async function previewFlex(jsonPath: string): Promise<ImportPreview> {
  const preset = openPreset(jsonPath)
  const root = getFlexioRoot()

  // Collect toolset names from incoming blueprints
  const incomingNames: string[] = []
  for (const app of APP_NAMES) {
    const toolsets = preset.blueprints?.apps?.[app]?.toolsets ?? []
    for (const ts of toolsets) {
      if (!incomingNames.includes(ts.name)) incomingNames.push(ts.name)
    }
  }

  // Collect toolset names already on disk
  const existingNames: string[] = []
  const current = loadBlueprints()
  for (const app of APP_NAMES) {
    for (const ts of current.apps[app]?.toolsets ?? []) {
      if (!existingNames.includes(ts.name)) existingNames.push(ts.name)
    }
  }

  const overlapping = incomingNames.filter((n) => existingNames.includes(n))
  return { incomingNames, existingNames, overlapping }
}

// ─── Import ──────────────────────────────────────────────────────────────────

export async function importFlex(jsonPath: string, mode: ConflictMode): Promise<void> {
  if (mode === 'cancel') return
  const preset = openPreset(jsonPath)
  const root = getFlexioRoot()

  // Step 1: restore script/icon files
  for (const [relPath, b64] of Object.entries(preset.scripts)) {
    const absPath = npath.join(root, relPath)
    ensureDir(npath.dirname(absPath))
    const buf = Buffer.from(b64, 'base64')
    nfs.writeFileSync(absPath, buf)
  }

  // Step 2: merge blueprints
  if (!preset.blueprints) return
  const current = loadBlueprints()
  const incoming = preset.blueprints

  const merged = { ...current }

  for (const app of APP_NAMES) {
    const currentToolsets  = current.apps[app]?.toolsets  ?? []
    const incomingToolsets = incoming.apps?.[app]?.toolsets ?? []

    let mergedToolsets = [...currentToolsets]

    for (const inTs of incomingToolsets) {
      const existIdx = mergedToolsets.findIndex((t) => t.name === inTs.name)

      if (existIdx === -1) {
        // Not present → always add
        mergedToolsets.push(inTs)
      } else if (mode === 'replace') {
        // Replace entire toolset
        mergedToolsets[existIdx] = inTs
      } else if (mode === 'updateAdd') {
        // Keep existing buttons, add/update with incoming
        const existButtons = mergedToolsets[existIdx].buttons
        const newButtons = [...existButtons]
        for (const inBtn of inTs.buttons) {
          const bIdx = newButtons.findIndex((b) => b.id === inBtn.id || b.name === inBtn.name)
          if (bIdx === -1) newButtons.push(inBtn)
          else newButtons[bIdx] = inBtn
        }
        mergedToolsets[existIdx] = { ...mergedToolsets[existIdx], buttons: newButtons }
      }
      // 'addMissing': overlapping toolset skipped (only new toolsets added above)
    }

    merged.apps = { ...merged.apps, [app]: { toolsets: mergedToolsets } }
  }

  // Merge panel settings (incoming values take priority for new fields)
  if (incoming.panelSettings) {
    for (const slot of PANEL_SLOTS) {
      if (incoming.panelSettings[slot]) {
        merged.panelSettings = {
          ...merged.panelSettings,
          [slot]: { ...merged.panelSettings[slot], ...incoming.panelSettings[slot] },
        }
      }
    }
  }

  saveBlueprints(merged)
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function openPreset(jsonPath: string): FlexPreset {
  const raw = nfs.readFileSync(jsonPath, 'utf8')
  const parsed = JSON.parse(raw) as FlexPreset
  if (!parsed.flexioPreset) {
    throw new Error('Not a valid Flexio preset file.')
  }
  return parsed
}

// ─── Default preset path ──────────────────────────────────────────────────────

export function getDefaultPresetDir(): string {
  return npath.join(getFlexioRoot(), 'UserPresets')
}

export function getDefaultPresetPath(): string {
  return npath.join(getDefaultPresetDir(), 'Flexio_Presets.json')
}

// ─── OS file dialogs ──────────────────────────────────────────────────────────

export function showSaveDialog(defaultName: string): string | undefined {
  try {
    const defaultDir = getDefaultPresetDir()
    ensureDir(defaultDir)
    const cp = (new Function('m', 'return require(m)'))('child_process') as typeof import('child_process')
    const result = cp.execSync(
      `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; ` +
      `$f = New-Object System.Windows.Forms.SaveFileDialog; ` +
      `$f.Filter = 'Flexio Preset (*.json)|*.json'; ` +
      `$f.DefaultExt = 'json'; ` +
      `$f.FileName = '${defaultName}'; ` +
      `$f.InitialDirectory = [System.IO.Path]::GetFullPath('${defaultDir.replace(/\\/g, '\\\\')}'); ` +
      `$f.ShowDialog() | Out-Null; $f.FileName"`,
      { encoding: 'utf8' },
    ).trim()
    if (!result) return undefined
    return result.endsWith('.json') ? result : result + '.json'
  } catch {
    return undefined
  }
}

export function showOpenDialog(): string | undefined {
  try {
    const defaultDir = getDefaultPresetDir()
    const cp = (new Function('m', 'return require(m)'))('child_process') as typeof import('child_process')
    const result = cp.execSync(
      `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; ` +
      `$f = New-Object System.Windows.Forms.OpenFileDialog; ` +
      `$f.Filter = 'Flexio Preset (*.json)|*.json'; ` +
      `$f.InitialDirectory = [System.IO.Path]::GetFullPath('${defaultDir.replace(/\\/g, '\\\\')}'); ` +
      `$f.ShowDialog() | Out-Null; $f.FileName"`,
      { encoding: 'utf8' },
    ).trim()
    return result || undefined
  } catch {
    return undefined
  }
}

export function openInExplorer(folderPath: string): void {
  try {
    const cp = (new Function('m', 'return require(m)'))('child_process') as typeof import('child_process')
    cp.exec(`explorer.exe "${folderPath}"`)
  } catch {
    // silently ignore
  }
}
