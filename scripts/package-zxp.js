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
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const zxp = require('zxp-sign-cmd')

// ─── Config ──────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..')
const CERT_DIR = path.join(ROOT, 'certs')
const CERT_FILE = path.join(CERT_DIR, 'flexio.p12')
const CERT_PASS = process.env.FLEXIO_CERT_PASS || 'Flexio2026CEP'
const STAGING_DIR = path.join(ROOT, '.package-staging')
const OUTPUT_DIR = path.join(ROOT, 'release')

// Files/directories to include in the ZXP (relative to project root)
const INCLUDE = [
  'CSXS',
  'dist',
  'jsx',
]

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
    await zxp.selfSignedCert({
      country: 'JP',
      province: 'Tokyo',
      org: 'Flexio',
      name: 'Flexio',
      password: CERT_PASS,
      output: CERT_FILE,
    })
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

  // Step 4: Sign & package
  console.log('✍️  Signing ZXP...')
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  const outputPath = path.join(OUTPUT_DIR, zxpFilename)

  if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)

  await zxp.sign({
    input: STAGING_DIR,
    output: outputPath,
    cert: CERT_FILE,
    password: CERT_PASS,
  })

  // Step 5: Cleanup
  rmrf(STAGING_DIR)

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
