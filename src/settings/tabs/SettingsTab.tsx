import React, { useState } from 'react'
import { useBlueprints } from '@/shared/context/BlueprintsContext'
import {
  exportFlex,
  importFlex,
  previewFlex,
  showSaveDialog,
  showOpenDialog,
  openInExplorer,
  getDefaultPresetPath,
  getDefaultPresetDir,
} from '@/shared/lib/flexFile'
import { loadBlueprints, getDefaultBlueprints, saveBlueprints } from '@/shared/lib/blueprints'
import { ImportConflictDialog } from '../components/ImportConflictDialog'
import type { ConflictMode, ConflictInfo } from '@/shared/types'
import styles from './SettingsTab.module.css'
import importIcon from '@/shared/assets/svg/import.svg'
import exportIcon from '@/shared/assets/svg/export.svg'
import folderIcon from '@/shared/assets/svg/folder.svg'

export function SettingsTab() {
  const { update } = useBlueprints()
  const [status,   setStatus]   = useState('')
  const [conflict, setConflict] = useState<{ path: string; info: ConflictInfo } | null>(null)

  async function handleExport() {
    const path = showSaveDialog('Flexio_Presets')
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
      setStatus('Reading preset file…')
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
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Presets</span>
        </div>
        <div className={styles.presetBtns}>
          <button className={styles.presetBtn} onClick={handleImport}>
            <img src={importIcon} alt="" width={12} height={12} />
            Import .json
          </button>
          <button className={styles.presetBtn} onClick={handleExport}>
            <img src={exportIcon} alt="" width={12} height={12} />
            Export .json
          </button>
          <button className={`${styles.presetBtn} ${styles.danger}`} onClick={handleDeleteAll}>
            Delete All
          </button>
        </div>

        <div className={styles.fileLoc}>
          <span className={styles.fileLocLabel}>Default Preset Location</span>
          <div className={styles.fileLocRow}>
            <span className={styles.fileLocPath}>{getDefaultPresetPath()}</span>
            <button
              className={styles.browseBtn}
              onClick={() => openInExplorer(getDefaultPresetDir())}
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

      {conflict && (
        <ImportConflictDialog
          info={conflict.info}
          onResolve={handleConflictResolve}
        />
      )}
    </div>
  )
}
