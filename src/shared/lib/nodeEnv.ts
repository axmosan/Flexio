/**
 * Safe Node.js module access for CEP (--enable-nodejs).
 * Uses Function constructor to bypass Vite's static `require` analysis.
 */

// eslint-disable-next-line @typescript-eslint/no-implied-eval
const _req = new Function('m', 'return require(m)') as <T = unknown>(m: string) => T

function safeRequire<T>(moduleName: string): T | null {
  try {
    return _req<T>(moduleName)
  } catch {
    return null
  }
}

export const nfs = safeRequire<typeof import('fs')>('fs')!
export const npath = safeRequire<typeof import('path')>('path')!
export const nos = safeRequire<typeof import('os')>('os')!

/** Whether we are running inside CEP with Node.js available */
export const isNodeAvailable = nfs !== null && npath !== null

/**
 * Ensure a directory exists (recursive mkdir).
 * Works like `mkdir -p`.
 */
export function ensureDir(dirPath: string): void {
  if (!nfs || !npath) return
  if (nfs.existsSync(dirPath)) return
  const parent = npath.dirname(dirPath)
  if (parent !== dirPath) ensureDir(parent)
  try {
    nfs.mkdirSync(dirPath)
  } catch {
    // ignore race conditions
  }
}

/**
 * Recursively list all file paths under a directory.
 */
export function listFilesRecursive(dir: string): string[] {
  if (!nfs || !npath) return []
  const results: string[] = []
  try {
    const entries = nfs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = npath.join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...listFilesRecursive(full))
      } else {
        results.push(full)
      }
    }
  } catch {
    // dir might not exist
  }
  return results
}

/**
 * Recursively delete a directory and all its contents.
 */
export function rmrf(targetPath: string): void {
  if (!nfs || !npath) return
  if (!nfs.existsSync(targetPath)) return
  const stat = nfs.statSync(targetPath)
  if (stat.isDirectory()) {
    const entries = nfs.readdirSync(targetPath)
    for (const entry of entries) {
      rmrf(npath.join(targetPath, entry))
    }
    nfs.rmdirSync(targetPath)
  } else {
    nfs.unlinkSync(targetPath)
  }
}
