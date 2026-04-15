/**
 * Generates a deterministic text-based icon for buttons that have no image.
 * Returns the text split into display rows (max 2 rows of 3 chars each).
 */

import { toAbsolutePath } from './paths'

/** Returns up to 2 display rows for a text icon (3 chars per row, max 6 total) */
export function getIconRows(text: string): [string, string | null] {
  const t = text.slice(0, 6).toUpperCase()
  if (t.length <= 3) return [t, null]
  return [t.slice(0, 3), t.slice(3)]
}

/**
 * Deterministic HSL color from a string.
 * Returns a dark, muted background suitable for the dark theme.
 */
export function nameToHsl(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
    hash |= 0
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 38%, 22%)`
}

/**
 * Given an icon path (relative), return a URL that can be used in <img src="...">.
 * The path is converted to an absolute file:// URL.
 */
export function iconPathToUrl(relativePath: string): string {
  if (!relativePath) return ''
  try {
    const abs = toAbsolutePath(relativePath)
    // On Windows, convert backslashes and prepend file:///
    return 'file:///' + abs.replace(/\\/g, '/')
  } catch {
    return ''
  }
}
