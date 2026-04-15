/**
 * install-ext.js
 *
 * Installs the Flexio CEP extension into the Adobe CEP extensions directory.
 * Run with: node scripts/install-ext.js
 *
 * What it does:
 *  1. Copies the real CSInterface.js from the Adobe CEP resources (if found)
 *  2. Runs `npm run build` to compile the extension
 *  3. Creates a symlink (or copies) the extension to the CEP extensions folder
 *  4. Enables PlayerDebugMode in the Windows registry (required for unsigned extensions)
 */

const fs = require('fs')
const path = require('path')
const os = require('os')
const { execSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..')
const EXT_ID = 'com.flexio'

// System-wide CEP extensions path (requires admin for symlink creation)
const CEP_EXTENSIONS = 'C:\\Program Files (x86)\\Common Files\\Adobe\\CEP\\extensions'
const INSTALL_PATH = path.join(CEP_EXTENSIONS, EXT_ID)

// ── 1. Copy real CSInterface.js if available ──────────────────────────────────
const CEP_RESOURCES = [
  'C:\\Program Files (x86)\\Common Files\\Adobe\\CEP\\resources\\CSInterface.js',
  'C:\\Program Files\\Common Files\\Adobe\\CEP\\resources\\CSInterface.js',
]

const publicLib = path.join(ROOT, 'public', 'lib')
if (!fs.existsSync(publicLib)) fs.mkdirSync(publicLib, { recursive: true })

let csiFound = false
for (const csiPath of CEP_RESOURCES) {
  if (fs.existsSync(csiPath)) {
    fs.copyFileSync(csiPath, path.join(publicLib, 'CSInterface.js'))
    console.log('✓ CSInterface.js copied from', csiPath)
    csiFound = true
    break
  }
}

if (!csiFound) {
  console.warn('⚠  Real CSInterface.js not found — using bundled stub.')
  console.warn('   Expected at:', CEP_RESOURCES[0])
}

// ── 2. Build ──────────────────────────────────────────────────────────────────
console.log('\n→ Building extension…')
try {
  execSync('npm run build', { cwd: ROOT, stdio: 'inherit' })
  console.log('✓ Build complete')
} catch (e) {
  console.error('✗ Build failed')
  process.exit(1)
}

// ── 3. Install via symlink (junction) ────────────────────────────────────────
if (!fs.existsSync(CEP_EXTENSIONS)) {
  console.error(`✗ CEP extensions directory not found: ${CEP_EXTENSIONS}`)
  console.error('  Make sure Adobe Creative Cloud is installed.')
  process.exit(1)
}

if (fs.existsSync(INSTALL_PATH) || isSymlink(INSTALL_PATH)) {
  console.log('→ Removing existing installation…')
  try {
    if (isSymlink(INSTALL_PATH)) {
      fs.unlinkSync(INSTALL_PATH)
    } else {
      fs.rmSync(INSTALL_PATH, { recursive: true, force: true })
    }
  } catch (e) {
    console.error('  Could not remove:', e.message)
    console.error('  → Try running this script as Administrator.')
    process.exit(1)
  }
}

// Junction symlink (no admin required for junctions pointing within same drive,
// but writing to Program Files always requires Administrator)
try {
  fs.symlinkSync(ROOT, INSTALL_PATH, 'junction')
  console.log(`✓ Symlink (junction) created:`)
  console.log(`    ${INSTALL_PATH}`)
  console.log(`  → ${ROOT}`)
} catch (e) {
  console.error(`✗ Failed to create symlink: ${e.message}`)
  console.error('  → Please run this script as Administrator:')
  console.error('    Right-click Command Prompt → "Run as administrator"')
  console.error('    Then: node scripts/install-ext.js')
  process.exit(1)
}

// ── 4. Enable PlayerDebugMode ─────────────────────────────────────────────────
console.log('\n→ Enabling CEP PlayerDebugMode…')
try {
  execSync(
    'reg add "HKCU\\Software\\Adobe\\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f',
    { stdio: 'inherit' },
  )
  // Also set for older CEP versions just in case
  for (const ver of ['11', '10', '9']) {
    try {
      execSync(
        `reg add "HKCU\\Software\\Adobe\\CSXS.${ver}" /v PlayerDebugMode /t REG_SZ /d 1 /f`,
        { stdio: 'pipe' },
      )
    } catch {}
  }
  console.log('✓ PlayerDebugMode enabled')
} catch (e) {
  console.warn('⚠  Could not set PlayerDebugMode (try running as Administrator):', e.message)
}

console.log('\n✅ Flexio installed successfully!')
console.log(`   Location: ${INSTALL_PATH}`)
console.log('   Restart your Adobe app → Window → Extensions → Flexio 1–4\n')

// ── Helpers ───────────────────────────────────────────────────────────────────

function isSymlink(p) {
  try { return fs.lstatSync(p).isSymbolicLink() } catch { return false }
}

function copyDir(src, dst, excludeDirs = []) {
  fs.mkdirSync(dst, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (excludeDirs.includes(entry.name)) continue
    const s = path.join(src, entry.name)
    const d = path.join(dst, entry.name)
    if (entry.isDirectory()) {
      copyDir(s, d, excludeDirs)
    } else {
      fs.copyFileSync(s, d)
    }
  }
}
