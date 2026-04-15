/**
 * .flex file format:
 *   AES-256 encrypted JSZip archive of the entire Flexio data directory.
 *
 * Export: zip Flexio root → encrypt → write .flex
 * Import: decrypt → unzip → write to Flexio root → reload blueprints
 */
import JSZip from 'jszip'
import { nfs, npath, ensureDir, listFilesRecursive } from './nodeEnv'
import { getFlexioRoot, toRelativePath } from './paths'
import { encryptBuffer, decryptToBase64 } from './encryption'
import type { ConflictMode } from '../types'

// ─── Export ──────────────────────────────────────────────────────────────────

/**
 * Package the entire Flexio data directory into an encrypted .flex file.
 * @param destPath  Absolute path where the .flex file should be written.
 */
export async function exportFlex(destPath: string): Promise<void> {
  const root = getFlexioRoot()
  const zip = new JSZip()
  const allFiles = listFilesRecursive(root)

  for (const absPath of allFiles) {
    const rel = toRelativePath(absPath).replace(/\\/g, '/')
    const content = nfs.readFileSync(absPath) // Buffer
    zip.file(rel, content)
  }

  const zipBase64 = await zip.generateAsync({ type: 'base64', compression: 'DEFLATE' })
  const encrypted = encryptBuffer(zipBase64)
  nfs.writeFileSync(destPath, encrypted, 'utf8')
}

// ─── Import ──────────────────────────────────────────────────────────────────

export interface ImportPreview {
  /** Names of buttons/scripts present in the incoming .flex */
  incomingNames: string[]
  /** Names already existing locally */
  existingNames: string[]
  /** Names present in both */
  overlapping: string[]
}

/**
 * Analyse a .flex file without extracting — returns overlap info for the dialog.
 */
export async function previewFlex(flexPath: string): Promise<ImportPreview> {
  const root = getFlexioRoot()
  const zip = await openFlex(flexPath)

  const incomingNames = Object.keys(zip.files)
    .filter((p) => p.startsWith('Scripts/') && p.split('/').length === 3 && p.endsWith('/'))
    .map((p) => p.split('/')[2])

  const existingNames: string[] = []
  const scriptsRoot = npath.join(root, 'Scripts')
  if (nfs.existsSync(scriptsRoot)) {
    for (const app of nfs.readdirSync(scriptsRoot)) {
      const appDir = npath.join(scriptsRoot, app)
      if (nfs.statSync(appDir).isDirectory()) {
        for (const name of nfs.readdirSync(appDir)) {
          existingNames.push(name)
        }
      }
    }
  }

  const overlapping = incomingNames.filter((n) => existingNames.includes(n))
  return { incomingNames, existingNames, overlapping }
}

/**
 * Extract a .flex file into the Flexio data directory.
 * @param flexPath  Absolute path of the .flex file.
 * @param mode      Conflict resolution strategy.
 */
export async function importFlex(flexPath: string, mode: ConflictMode): Promise<void> {
  if (mode === 'cancel') return

  const root = getFlexioRoot()
  const zip = await openFlex(flexPath)

  for (const [relPath, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue

    const absPath = npath.join(root, relPath)

    // Determine the script name (third path segment under Scripts/{App}/{Name}/...)
    const parts = relPath.split('/')
    const isScript = parts[0] === 'Scripts' && parts.length >= 3
    const scriptName = isScript ? parts[2] : null

    if (mode === 'replace') {
      // Write everything unconditionally
      ensureDir(npath.dirname(absPath))
      const content = await entry.async('nodebuffer')
      nfs.writeFileSync(absPath, content)
    } else if (mode === 'updateAdd') {
      // Always overwrite
      ensureDir(npath.dirname(absPath))
      const content = await entry.async('nodebuffer')
      nfs.writeFileSync(absPath, content)
    } else if (mode === 'addMissing') {
      // Only add if the script doesn't exist yet
      if (scriptName && nfs.existsSync(npath.join(root, 'Scripts'))) {
        const scriptExists = checkScriptExists(root, scriptName)
        if (scriptExists) continue
      }
      ensureDir(npath.dirname(absPath))
      const content = await entry.async('nodebuffer')
      nfs.writeFileSync(absPath, content)
    }
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function openFlex(flexPath: string): Promise<JSZip> {
  const encrypted = nfs.readFileSync(flexPath, 'utf8')
  const zipBase64 = decryptToBase64(encrypted)
  const zip = new JSZip()
  await zip.loadAsync(zipBase64, { base64: true })
  return zip
}

function checkScriptExists(root: string, scriptName: string): boolean {
  const scriptsRoot = npath.join(root, 'Scripts')
  if (!nfs.existsSync(scriptsRoot)) return false
  for (const app of nfs.readdirSync(scriptsRoot)) {
    const candidate = npath.join(scriptsRoot, app, scriptName)
    if (nfs.existsSync(candidate)) return true
  }
  return false
}

// ─── Open save/open dialog via CEP file dialog ───────────────────────────────

/**
 * Show the OS "Save File" dialog and return the chosen path.
 * In CEP, we call a native method via window.cep.
 * Falls back to undefined if not in CEP.
 */
export function showSaveDialog(defaultName: string): string | undefined {
  if (typeof window === 'undefined') return undefined
  const cep = (window as unknown as { cep?: { fs?: unknown } }).cep
  if (!cep) return undefined

  // Use Node.js child_process / PowerShell for a save dialog on Windows
  try {
    const cp = (new Function('m', 'return require(m)'))('child_process') as typeof import('child_process')
    const result = cp.execSync(
      `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; ` +
      `$f = New-Object System.Windows.Forms.SaveFileDialog; ` +
      `$f.Filter = 'Flex files (*.flex)|*.flex'; ` +
      `$f.FileName = '${defaultName}'; ` +
      `$f.ShowDialog() | Out-Null; $f.FileName"`,
      { encoding: 'utf8' },
    ).trim()
    return result || undefined
  } catch {
    return undefined
  }
}

export function showOpenDialog(): string | undefined {
  try {
    const cp = (new Function('m', 'return require(m)'))('child_process') as typeof import('child_process')
    const result = cp.execSync(
      `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; ` +
      `$f = New-Object System.Windows.Forms.OpenFileDialog; ` +
      `$f.Filter = 'Flex files (*.flex)|*.flex'; ` +
      `$f.ShowDialog() | Out-Null; $f.FileName"`,
      { encoding: 'utf8' },
    ).trim()
    return result || undefined
  } catch {
    return undefined
  }
}

/** Open Windows Explorer at a given folder path */
export function openInExplorer(folderPath: string): void {
  try {
    const cp = (new Function('m', 'return require(m)'))('child_process') as typeof import('child_process')
    cp.exec(`explorer.exe "${folderPath}"`)
  } catch {
    // silently ignore
  }
}
