/**
 * scripts/package-zxp.js
 *
 * Flexio を .zxp ファイルにパッケージングするスクリプト。
 *
 * 使い方:
 *   npm run package
 *
 * 初回実行時に自己署名証明書 (certs/flexio.p12) を自動生成します。
 * 証明書のパスワードは環境変数 FLEXIO_CERT_PASS で設定できます。
 * 未設定の場合はデフォルト値を使用します。
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// ─── Config ──────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..')
const CERT_DIR = path.join(ROOT, 'certs')
const CERT_FILE = path.join(CERT_DIR, 'flexio.p12')
const CERT_PASS = process.env.FLEXIO_CERT_PASS || 'Flexio2026CEP'
const STAGING_DIR = path.join(ROOT, '.package-staging')
const OUTPUT_DIR = path.join(ROOT, 'release')
const BUNDLE_ID = 'com.flexio'

// Files/directories to include in the ZXP (relative to project root)
const INCLUDE = [
  'CSXS',
  'dist',
  'jsx',
]

// ─── Resolve ZXPSignCmd path ──────────────────────────────────────────────────

function getZXPSignCmd() {
  try {
    const mod = require('zxp-sign-cmd')
    // zxp-sign-cmd exports { sign, selfSignedCert } or a path string
    if (typeof mod === 'string') return mod
    if (mod.bin) return mod.bin
    // Try to find the binary in the package
    const pkgDir = path.dirname(require.resolve('zxp-sign-cmd/package.json'))
    const candidates = [
      path.join(pkgDir, 'bin', 'ZXPSignCmd.exe'),
      path.join(pkgDir, 'bin', 'win64', 'ZXPSignCmd.exe'),
      path.join(pkgDir, 'ZXPSignCmd.exe'),
    ]
    for (const c of candidates) {
      if (fs.existsSync(c)) return c
    }
    // Use the module's API if available
    if (mod.sign && mod.selfSignedCert) return mod
    throw new Error('Binary not found in zxp-sign-cmd package')
  } catch (e) {
    console.error('❌ zxp-sign-cmd not found. Run: npm install --save-dev zxp-sign-cmd')
    process.exit(1)
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rmrf(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

function copyRecursive(src, dst) {
  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true })
    for (const entry of fs.readdirSync(src)) {
      // Skip files that shouldn't be in the ZXP
      if (entry === 'node_modules' || entry === '.git' || entry === '.DS_Store') continue
      copyRecursive(path.join(src, entry), path.join(dst, entry))
    }
  } else if (stat.isFile()) {
    fs.copyFileSync(src, dst)
  }
}

function getVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
  return pkg.version || '1.0.0'
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const zxp = getZXPSignCmd()
  const version = getVersion()
  const zxpFilename = `Flexio-v${version}.zxp`

  console.log('📦 Flexio ZXP Packager')
  console.log(`   Version: ${version}`)
  console.log('')

  // Step 1: Build
  console.log('🔨 Building...')
  execSync('npm run build', { cwd: ROOT, stdio: 'inherit' })
  console.log('')

  // Step 2: Create certificate if needed
  if (!fs.existsSync(CERT_FILE)) {
    console.log('🔑 Creating self-signed certificate...')
    fs.mkdirSync(CERT_DIR, { recursive: true })

    if (typeof zxp === 'object' && zxp.selfSignedCert) {
      // Use API
      await new Promise((resolve, reject) => {
        zxp.selfSignedCert({
          country: 'JP',
          province: 'Tokyo',
          org: 'Flexio',
          name: 'Flexio',
          password: CERT_PASS,
          output: CERT_FILE,
        }, (err) => err ? reject(err) : resolve())
      })
    } else {
      // Use CLI
      const cmd = `"${zxp}" -selfSignedCert JP Tokyo Flexio Flexio "${CERT_PASS}" "${CERT_FILE}"`
      execSync(cmd, { stdio: 'inherit' })
    }
    console.log(`   ✅ Certificate created: certs/flexio.p12`)
    console.log('')
  } else {
    console.log('🔑 Using existing certificate: certs/flexio.p12')
    console.log('')
  }

  // Step 3: Stage files
  console.log('📁 Staging files...')
  rmrf(STAGING_DIR)
  fs.mkdirSync(STAGING_DIR, { recursive: true })

  for (const item of INCLUDE) {
    const src = path.join(ROOT, item)
    const dst = path.join(STAGING_DIR, item)
    if (fs.existsSync(src)) {
      copyRecursive(src, dst)
      console.log(`   ✓ ${item}`)
    } else {
      console.warn(`   ⚠ ${item} not found, skipping`)
    }
  }
  console.log('')

  // Step 4: Sign
  console.log('✍️  Signing ZXP...')
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  const outputPath = path.join(OUTPUT_DIR, zxpFilename)

  // Remove old output if exists
  if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)

  if (typeof zxp === 'object' && zxp.sign) {
    // Use API
    await new Promise((resolve, reject) => {
      zxp.sign({
        input: STAGING_DIR,
        output: outputPath,
        cert: CERT_FILE,
        password: CERT_PASS,
      }, (err) => err ? reject(err) : resolve())
    })
  } else {
    // Use CLI
    const cmd = `"${zxp}" -sign "${STAGING_DIR}" "${outputPath}" "${CERT_FILE}" "${CERT_PASS}"`
    execSync(cmd, { stdio: 'inherit' })
  }

  // Step 5: Cleanup
  rmrf(STAGING_DIR)

  // Done
  const stat = fs.statSync(outputPath)
  const sizeMB = (stat.size / 1024 / 1024).toFixed(2)

  console.log('')
  console.log('═══════════════════════════════════════════════')
  console.log(`  ✅ ${zxpFilename} (${sizeMB} MB)`)
  console.log(`  📂 ${OUTPUT_DIR}`)
  console.log('═══════════════════════════════════════════════')
  console.log('')
  console.log('配布方法:')
  console.log('  1. .zxp ファイルを相手に渡す')
  console.log('  2. ZXP/UXP Installer でインストール')
  console.log('     https://aescripts.com/learn/zxp-installer/')
  console.log('')
}

main().catch((err) => {
  console.error('❌ Package failed:', err.message || err)
  rmrf(STAGING_DIR)
  process.exit(1)
})
