import React, { useState } from 'react'
import { useBlueprints } from '@/shared/context/BlueprintsContext'
import { APP_NAMES, APP_DISPLAY_NAMES, PANEL_SLOTS } from '@/shared/types'
import type { AppName, PanelSlot } from '@/shared/types'
import { getFlexioRoot, getBlueprintsPath } from '@/shared/lib/paths'
import {
  exportFlex,
  importFlex,
  previewFlex,
  showSaveDialog,
  showOpenDialog,
  openInExplorer,
} from '@/shared/lib/flexFile'
import { loadBlueprints, getDefaultBlueprints, saveBlueprints } from '@/shared/lib/blueprints'
import { ImportConflictDialog } from '../components/ImportConflictDialog'
import type { ConflictMode, ConflictInfo } from '@/shared/types'
import styles from './SettingsTab.module.css'
import importIcon from '@/shared/assets/svg/import.svg'
import exportIcon from '@/shared/assets/svg/export.svg'
import folderIcon from '@/shared/assets/svg/folder.svg'

// Read initial app from URL param
const VALID_APPS: AppName[] = ['AfterEffects', 'PremierePro', 'Illustrator', 'Photoshop']

function getInitialApp(): AppName {
  const p = new URLSearchParams(window.location.search)
  const fromUrl = p.get('app')
  if (fromUrl && VALID_APPS.includes(fromUrl as AppName)) return fromUrl as AppName
  try {
    const ctx = JSON.parse(localStorage.getItem('flexio_settings_ctx') ?? '{}')
    if (ctx.app && VALID_APPS.includes(ctx.app)) return ctx.app as AppName
  } catch { /* ignore */ }
  return 'AfterEffects'
}

// ── Slider component ──────────────────────────────────────────────────────────
function Slider({
  label, value, min, max, unit = 'px',
  onChange,
}: {
  label: string; value: number; min: number; max: number; unit?: string
  onChange: (v: number) => void
}) {
  return (
    <div className={styles.sliderGroup}>
      <div className={styles.sliderHeader}>
        <span className={styles.sliderLabel}>{label}</span>
        <span className={styles.sliderValue}>{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={styles.slider}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export function SettingsTab() {
  const { blueprints, updateSettings, updateAllocation, update } = useBlueprints()
  const [activeApp, setActiveApp] = useState<AppName>(getInitialApp)
  const [status, setStatus] = useState('')
  const [conflict, setConflict] = useState<{ path: string; info: ConflictInfo } | null>(null)

  // ── Allocation ──────────────────────────────────────────────────────────────
  const appToolsets = blueprints.apps[activeApp].toolsets

  function handleAllocationChange(slot: PanelSlot, toolsetId: string) {
    updateAllocation(activeApp, { [slot]: toolsetId })
  }

  // ── Import/Export ───────────────────────────────────────────────────────────
  async function handleExport() {
    const path = showSaveDialog('flexio_preset')
    if (!path) return
    try {
      setStatus('Exporting…')
      await exportFlex(path)
      setStatus('Exported successfully.')
      openInExplorer(path.substring(0, path.lastIndexOf('\\')))
    } catch (e) {
      setStatus(`Export failed: ${String(e)}`)
    }
  }

  async function handleImport() {
    const path = showOpenDialog()
    if (!path) return
    try {
      setStatus('Reading .flex file…')
      const info = await previewFlex(path)
      if (info.overlapping.length > 0) {
        setConflict({ path, info })
      } else {
        await importFlex(path, 'addMissing')
        update(() => loadBlueprints())
        setStatus('Imported successfully.')
      }
    } catch (e) {
      setStatus(`Import failed: ${String(e)}`)
    }
  }

  async function handleConflictResolve(mode: ConflictMode) {
    if (!conflict) return
    const path = conflict.path
    setConflict(null)
    if (mode === 'cancel') { setStatus('Import cancelled.'); return }
    try {
      setStatus('Importing…')
      await importFlex(path, mode)
      update(() => loadBlueprints())
      setStatus('Imported successfully.')
    } catch (e) {
      setStatus(`Import failed: ${String(e)}`)
    }
  }

  function handleDeleteAll() {
    if (!window.confirm('Delete ALL scripts and reset Flexio? This cannot be undone.')) return
    const fresh = getDefaultBlueprints()
    saveBlueprints(fresh)
    update(() => fresh)
    setStatus('All data deleted.')
  }

  return (
    <div className={styles.root}>
      {/* Allocation section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Allocation</span>
          {/* App selector */}
          <select
            value={activeApp}
            onChange={(e) => setActiveApp(e.target.value as AppName)}
            className={styles.appSelect}
          >
            {APP_NAMES.map((a) => (
              <option key={a} value={a}>{APP_DISPLAY_NAMES[a]}</option>
            ))}
          </select>
        </div>
        <div className={styles.allocationGrid}>
          {PANEL_SLOTS.map((slot) => (
            <div key={slot} className={styles.allocationRow}>
              <span className={styles.slotLabel}>
                Flexio {slot.replace('panel', '')}
              </span>
              <select
                value={blueprints.allocation[activeApp][slot]}
                onChange={(e) => handleAllocationChange(slot, e.target.value)}
                className={styles.toolsetSelect}
              >
                <option value="">— Unassigned —</option>
                {appToolsets.map((ts) => (
                  <option key={ts.id} value={ts.id}>{ts.name}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>

      {/* General section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>General</span>
        </div>
        <Slider
          label="Button Scale"
          value={blueprints.settings.buttonScale}
          min={32} max={128}
          onChange={(v) => updateSettings({ buttonScale: v })}
        />
        <Slider
          label="Button Spacing"
          value={blueprints.settings.buttonSpacing}
          min={0} max={32}
          onChange={(v) => updateSettings({ buttonSpacing: v })}
        />
      </section>

      {/* Presets section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Presets</span>
        </div>
        <div className={styles.presetBtns}>
          <button className={styles.presetBtn} onClick={handleImport}>
            <img src={importIcon} alt="" width={12} height={12} />
            Import .flex
          </button>
          <button className={styles.presetBtn} onClick={handleExport}>
            <img src={exportIcon} alt="" width={12} height={12} />
            Export .flex
          </button>
          <button className={`${styles.presetBtn} ${styles.danger}`} onClick={handleDeleteAll}>
            Delete All
          </button>
        </div>

        {/* File location */}
        <div className={styles.fileLoc}>
          <span className={styles.fileLocLabel}>.flex File Location</span>
          <div className={styles.fileLocRow}>
            <span className={styles.fileLocPath}>{getBlueprintsPath()}</span>
            <button
              className={styles.browseBtn}
              onClick={() => openInExplorer(getFlexioRoot())}
              title="Open folder"
            >
              <img src={folderIcon} alt="Open" width={12} height={12} />
            </button>
          </div>
        </div>

        {status && (
          <div className={`${styles.status} ${status.includes('fail') ? styles.statusErr : ''}`}>
            {status}
          </div>
        )}
      </section>

      {/* Conflict dialog */}
      {conflict && (
        <ImportConflictDialog
          info={conflict.info}
          onResolve={handleConflictResolve}
        />
      )}
    </div>
  )
}
