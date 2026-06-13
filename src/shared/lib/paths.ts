import { npath, nos } from './nodeEnv'
import type { AppName } from '../types'

/** Root of all Flexio user data: C:\Users\{user}\Documents\Flexio\ */
export function getFlexioRoot(): string {
  if (!nos || !npath) return ''
  return npath.join(nos.homedir(), 'Documents', 'Flexio')
}

export function getBlueprintsPath(): string {
  return npath.join(getFlexioRoot(), 'flexio-blueprints.json')
}

export function getScriptsRoot(): string {
  return npath.join(getFlexioRoot(), 'Scripts')
}

/** Directory for a specific script slot: Scripts/{App}/{key}/ */
export function getScriptDir(app: AppName, key: string): string {
  return npath.join(getScriptsRoot(), app, key)
}

/** Code directory: Scripts/{App}/{key}/code/ */
export function getCodeDir(app: AppName, key: string): string {
  return npath.join(getScriptDir(app, key), 'code')
}

/** Icon directory: Scripts/{App}/{key}/icon/ */
export function getIconDir(app: AppName, key: string): string {
  return npath.join(getScriptDir(app, key), 'icon')
}

/**
 * Derive the script root directory from a stored relative path.
 * Works for both old name-based paths and new UUID-based paths.
 *
 * Example: "Scripts/AfterEffects/abc-uuid/code/Sample.jsx"
 *          → "<root>/Scripts/AfterEffects/abc-uuid"
 */
export function getScriptDirFromRelPath(relPath: string): string {
  // relPath format: "Scripts/<App>/<key>/code/<file>" or "Scripts/<App>/<key>/icon/<file>"
  const parts = relPath.replace(/\\/g, '/').split('/')
  // parts[0]="Scripts", parts[1]=app, parts[2]=key
  if (parts.length < 3) return ''
  return npath.join(getFlexioRoot(), parts[0], parts[1], parts[2])
}

/**
 * Convert an absolute path to a path relative to the Flexio root.
 * Stored in blueprints.json as portable cross-machine references.
 */
export function toRelativePath(absolutePath: string): string {
  const root = getFlexioRoot()
  return npath.relative(root, absolutePath).replace(/\\/g, '/')
}

/**
 * Resolve a relative blueprints path back to an absolute path.
 */
export function toAbsolutePath(relativePath: string): string {
  return npath.join(getFlexioRoot(), relativePath)
}

/** Extension of a file path (lowercase, without dot) */
export function fileExt(filePath: string): string {
  return npath.extname(filePath).toLowerCase().replace('.', '')
}

/** Basename without extension */
export function baseName(filePath: string): string {
  return npath.basename(filePath, npath.extname(filePath))
}
