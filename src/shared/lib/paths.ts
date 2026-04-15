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

/** Directory for a specific script: Scripts/{App}/{ScriptName}/ */
export function getScriptDir(app: AppName, scriptName: string): string {
  return npath.join(getScriptsRoot(), app, scriptName)
}

/** Code directory: Scripts/{App}/{ScriptName}/code/ */
export function getCodeDir(app: AppName, scriptName: string): string {
  return npath.join(getScriptDir(app, scriptName), 'code')
}

/** Icon directory: Scripts/{App}/{ScriptName}/icon/ */
export function getIconDir(app: AppName, scriptName: string): string {
  return npath.join(getScriptDir(app, scriptName), 'icon')
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
