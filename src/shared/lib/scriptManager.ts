/**
 * Manages script and icon files under:
 *   C:\Users\{user}\Documents\Flexio\Scripts\{App}\{Name}\code\
 *   C:\Users\{user}\Documents\Flexio\Scripts\{App}\{Name}\icon\
 */
import { nfs, npath, ensureDir, rmrf } from './nodeEnv'
import {
  getCodeDir,
  getIconDir,
  getScriptDir,
  toRelativePath,
  baseName,
  fileExt,
} from './paths'
import type { AppName, ButtonDef } from '../types'

// ─── Copy a script file into the Flexio data directory ───────────────────────

export interface SavedScript {
  scriptPath: string // relative path
  scriptName: string // name derived from file (for button default name)
}

export function saveScriptFile(app: AppName, srcPath: string, buttonName: string): SavedScript {
  const name = buttonName || baseName(srcPath)
  const ext = fileExt(srcPath)
  const codeDir = getCodeDir(app, name)
  ensureDir(codeDir)
  const destFile = npath.join(codeDir, `${name}.${ext}`)
  nfs.copyFileSync(srcPath, destFile)
  return {
    scriptPath: toRelativePath(destFile),
    scriptName: name,
  }
}

// ─── Copy an icon file into the Flexio data directory ────────────────────────

export interface SavedIcon {
  iconPath: string // relative path
}

export function saveIconFile(app: AppName, scriptName: string, srcPath: string): SavedIcon {
  const ext = fileExt(srcPath)
  const iconDir = getIconDir(app, scriptName)
  ensureDir(iconDir)
  const destFile = npath.join(iconDir, `icon.${ext}`)
  nfs.copyFileSync(srcPath, destFile)
  return { iconPath: toRelativePath(destFile) }
}

// ─── Update an existing script's code file ───────────────────────────────────

export function updateScriptFile(app: AppName, scriptName: string, srcPath: string): string {
  const ext = fileExt(srcPath)
  const codeDir = getCodeDir(app, scriptName)
  ensureDir(codeDir)
  const destFile = npath.join(codeDir, `${scriptName}.${ext}`)
  nfs.copyFileSync(srcPath, destFile)
  return toRelativePath(destFile)
}

// ─── Update an existing script's icon file ───────────────────────────────────

export function updateIconFile(app: AppName, scriptName: string, srcPath: string): string {
  const ext = fileExt(srcPath)
  const iconDir = getIconDir(app, scriptName)
  ensureDir(iconDir)
  const destFile = npath.join(iconDir, `icon.${ext}`)
  nfs.copyFileSync(srcPath, destFile)
  return toRelativePath(destFile)
}

// ─── Delete a script's entire directory ──────────────────────────────────────

export function deleteScriptDir(app: AppName, scriptName: string): void {
  const dir = getScriptDir(app, scriptName)
  rmrf(dir)
}

// ─── Duplicate a script directory ────────────────────────────────────────────

export function duplicateScriptDir(app: AppName, originalName: string, newName: string): void {
  const srcDir = getScriptDir(app, originalName)
  const dstDir = getScriptDir(app, newName)
  copyDirRecursive(srcDir, dstDir)
}

function copyDirRecursive(src: string, dst: string): void {
  ensureDir(dst)
  const entries = nfs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = npath.join(src, entry.name)
    const dstPath = npath.join(dst, entry.name)
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, dstPath)
    } else {
      nfs.copyFileSync(srcPath, dstPath)
    }
  }
}

// ─── Read script content for execution ───────────────────────────────────────

export function readScriptContent(relativePath: string): string {
  const { toAbsolutePath } = require('./paths') as typeof import('./paths')
  const absPath = toAbsolutePath(relativePath)
  return nfs.readFileSync(absPath, 'utf8')
}

// ─── Generate a safe folder name from a button name ──────────────────────────

export function safeFolderName(name: string): string {
  return name
    .trim()
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 64) || 'Script'
}

// ─── Build the autoIconText from a button name (max 6 chars) ─────────────────

export function buildAutoIconText(name: string): string {
  if (!name) return '?'
  // Split by spaces/underscores and take first letter of each word (abbreviation)
  const words = name.trim().split(/[\s_]+/)
  if (words.length >= 2 && words.every((w) => w.length > 0)) {
    const abbr = words.map((w) => w[0].toUpperCase()).join('').slice(0, 6)
    if (abbr.length >= 2) return abbr
  }
  // Just take the first 6 characters
  return name.trim().slice(0, 6).toUpperCase()
}
