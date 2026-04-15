import { nfs } from './nodeEnv'
import { ensureDir } from './nodeEnv'
import { getBlueprintsPath, getFlexioRoot } from './paths'
import type {
  BlueprintsData,
  AppName,
  AllocationMap,
  PanelSlot,
  PANEL_SLOTS,
} from '../types'
import { APP_NAMES } from '../types'

// ─── Defaults ────────────────────────────────────────────────────────────────

function defaultAllocation(): AllocationMap {
  return { panel1: '', panel2: '', panel3: '', panel4: '' }
}

export function getDefaultBlueprints(): BlueprintsData {
  const apps = {} as BlueprintsData['apps']
  const allocation = {} as BlueprintsData['allocation']
  for (const app of APP_NAMES) {
    apps[app] = { toolsets: [] }
    allocation[app] = defaultAllocation()
  }
  return {
    version: '1.0.0',
    lastModified: new Date().toISOString(),
    allocation,
    settings: { buttonScale: 64, buttonSpacing: 8 },
    apps,
  }
}

// ─── Load ────────────────────────────────────────────────────────────────────

export function loadBlueprints(): BlueprintsData {
  const path = getBlueprintsPath()
  try {
    if (!nfs.existsSync(path)) return getDefaultBlueprints()
    const raw = nfs.readFileSync(path, 'utf8')
    const parsed = JSON.parse(raw) as BlueprintsData
    // Ensure all apps exist (forward-compatibility)
    for (const app of APP_NAMES) {
      if (!parsed.apps[app]) parsed.apps[app] = { toolsets: [] }
      if (!parsed.allocation[app]) parsed.allocation[app] = defaultAllocation()
    }
    return parsed
  } catch {
    return getDefaultBlueprints()
  }
}

// ─── Save ────────────────────────────────────────────────────────────────────

export function saveBlueprints(data: BlueprintsData): void {
  data.lastModified = new Date().toISOString()
  const path = getBlueprintsPath()
  ensureDir(getFlexioRoot())
  nfs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8')
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Get the lastModified timestamp from blueprints without full parse */
export function getBlueprintsTimestamp(): string {
  try {
    const path = getBlueprintsPath()
    if (!nfs.existsSync(path)) return ''
    const stat = nfs.statSync(path)
    return stat.mtimeMs.toString()
  } catch {
    return ''
  }
}
