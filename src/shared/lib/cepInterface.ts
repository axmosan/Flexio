/**
 * Thin wrapper around the CEP CSInterface (loaded globally via <script> in HTML).
 * Provides typed access to the CEP runtime.
 */
import type { AppName, PanelSlot } from '../types'
import { HOST_APP_MAP } from '../types'

// The CSInterface class is loaded via <script src="./lib/CSInterface.js"> in HTML
declare class CSInterface {
  getExtensionID(): string
  getHostEnvironment(): { appName: string; appVersion: string; appLocale: string }
  evalScript(script: string, callback?: (result: string) => void): void
  getSystemPath(pathType: string): string
  requestOpenExtension(extensionId: string, params?: string): void
  closeExtension(): void
  addEventListener(type: string, listener: (event: { type: string; data: unknown }) => void): void
  removeEventListener(type: string, listener: (event: { type: string; data: unknown }) => void): void
  dispatchEvent(event: CSEvent): void
}

declare class CSEvent {
  constructor(type: string, scope: string, appId?: string, extensionId?: string)
  type: string
  scope: string
  appId: string
  extensionId: string
  data: string
}

let _cs: CSInterface | null = null

function getCS(): CSInterface | null {
  if (_cs) return _cs
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const CSIClass = (window as unknown as { CSInterface: new () => CSInterface }).CSInterface
    if (CSIClass) {
      _cs = new CSIClass()
      return _cs
    }
  } catch {
    /* not in CEP */
  }
  return null
}

/** Whether we are running inside a CEP panel */
export function isCEP(): boolean {
  return getCS() !== null
}

/** The current extension ID, e.g. "com.flexio.panel2" */
export function getExtensionId(): string {
  return getCS()?.getExtensionID() ?? ''
}

/** Derive panel slot from extension ID */
export function getPanelSlot(): PanelSlot {
  const id = getExtensionId()
  const match = id.match(/panel(\d)$/)
  const num = match ? match[1] : '1'
  return `panel${num}` as PanelSlot
}

/** The host application (After Effects, Premiere Pro, etc.) */
export function getHostApp(): AppName {
  const env = getCS()?.getHostEnvironment()
  if (!env) return 'AfterEffects'
  return HOST_APP_MAP[env.appName] ?? 'AfterEffects'
}

/**
 * Execute a JSX script in the host application.
 * Uses $.evalFile() in the host JSX to support both .jsx and .jsxbin.
 */
export function executeScript(absoluteScriptPath: string): Promise<string> {
  return new Promise((resolve) => {
    const cs = getCS()
    if (!cs) {
      resolve('ERROR: Not running in CEP')
      return
    }
    const escaped = absoluteScriptPath.replace(/\\/g, '/')
    cs.evalScript(`executeScript(${JSON.stringify(escaped)})`, (result) => {
      resolve(result ?? '')
    })
  })
}

const BLUEPRINTS_CHANGED_EVENT = 'com.flexio.blueprintsChanged'

/**
 * Dispatch a blueprintsChanged event to all panels via CSInterface.
 * Uses JavaScript-side CSEvent dispatch (works across all host apps,
 * unlike the ExtendScript PlugPlugExternalObject approach).
 */
export function dispatchBlueprintsChanged(): void {
  const cs = getCS()
  if (!cs) return
  try {
    // CSEvent is defined globally by CSInterface.js
    const CSEventClass = (window as unknown as { CSEvent: new (type: string, scope: string) => CSEvent }).CSEvent
    const event = new CSEventClass(BLUEPRINTS_CHANGED_EVENT, 'APPLICATION')
    event.data = ''
    cs.dispatchEvent(event)
  } catch {
    // Fallback: try ExtendScript path (AE/PPro only)
    cs.evalScript(`dispatchFlexioEvent(${JSON.stringify(BLUEPRINTS_CHANGED_EVENT)})`)
  }
}

/**
 * Subscribe to blueprintsChanged events dispatched by other panels/settings.
 * Returns an unsubscribe function.
 */
export function onBlueprintsChanged(callback: () => void): () => void {
  const cs = getCS()
  if (!cs) return () => {}
  const listener = () => callback()
  cs.addEventListener(BLUEPRINTS_CHANGED_EVENT, listener)
  return () => cs.removeEventListener(BLUEPRINTS_CHANGED_EVENT, listener)
}

/**
 * Open the Flexio Settings window.
 *
 * Strategy (in order of reliability):
 *  1. csInterface.requestOpenExtension() — proper CEP method for Custom panels
 *  2. window.open() — fallback when not in CEP or requestOpenExtension fails
 *
 * App/slot context is stored in localStorage so the settings window can read it
 * regardless of which opening method was used.
 */
export function openSettingsWindow(app: AppName, slot: PanelSlot): void {
  // Store context so the settings window can pick it up
  try {
    localStorage.setItem('flexio_settings_ctx', JSON.stringify({ app, slot }))
  } catch { /* ignore */ }

  const cs = getCS()

  // Method 1: requestOpenExtension (most reliable in CEP)
  if (cs) {
    try {
      cs.requestOpenExtension('com.flexio.settings', '')
      return
    } catch { /* fall through */ }
  }

  // Method 2: window.open fallback — resolve absolute path via CEP system path
  let settingsUrl: string
  if (cs) {
    try {
      const extPath = cs.getSystemPath('extension')
      settingsUrl = `file:///${extPath.replace(/\\/g, '/')}/dist/src/settings/index.html?app=${app}&panel=${slot}`
    } catch {
      settingsUrl = `${new URL('../settings/index.html', window.location.href).href}?app=${app}&panel=${slot}`
    }
  } else {
    settingsUrl = `${new URL('../settings/index.html', window.location.href).href}?app=${app}&panel=${slot}`
  }
  const win = window.open(settingsUrl, 'FlexioSettings', 'width=640,height=740,resizable=yes,scrollbars=no')
  if (win) win.focus()
}
