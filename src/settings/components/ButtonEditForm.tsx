import React, { useRef, useState } from 'react'
import { useBlueprints } from '@/shared/context/BlueprintsContext'
import { buildAutoIconText } from '@/shared/lib/scriptManager'
import type { AppName, ButtonDef } from '@/shared/types'
import styles from './ButtonEditForm.module.css'
import folderIcon from '@/shared/assets/svg/folder.svg'
import crossIcon from '@/shared/assets/svg/cross.svg'

interface Props {
  app: AppName
  toolsetId: string
  /** If provided, we're editing an existing button. Otherwise, adding new. */
  button?: ButtonDef
  onDone: () => void
}

export function ButtonEditForm({ app, toolsetId, button, onDone }: Props) {
  const { addButton, updateButton } = useBlueprints()
  const isEditing = !!button

  const [name, setName] = useState(button?.name ?? '')
  const [description, setDescription] = useState(button?.description ?? '')
  const [scriptPath, setScriptPath] = useState<string | null>(null)
  const [iconPath, setIconPath] = useState<string | null>(null)
  const [clearIcon, setClearIcon] = useState(false)
  const [error, setError] = useState('')

  const scriptInputRef = useRef<HTMLInputElement>(null)
  const iconInputRef = useRef<HTMLInputElement>(null)

  function handleScriptChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const path = (file as File & { path?: string }).path ?? ''
    if (!path) return
    setScriptPath(path)
    if (!name) setName(file.name.replace(/\.(jsx|jsxbin)$/i, ''))
  }

  function handleIconChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const path = (file as File & { path?: string }).path ?? ''
    if (!path) return
    setIconPath(path)
    setClearIcon(false)
  }

  function handleSave() {
    if (!isEditing && !scriptPath) {
      setError('Please select a script file.')
      return
    }
    if (!name.trim()) {
      setError('Please enter a button name.')
      return
    }

    if (isEditing) {
      updateButton(app, toolsetId, button!.id, {
        name: name.trim(),
        description: description.trim(),
        scriptSrcPath: scriptPath ?? undefined,
        iconSrcPath: iconPath,
        clearIcon,
      })
    } else {
      addButton(app, toolsetId, scriptPath!, iconPath, name.trim(), description.trim())
    }
    onDone()
  }

  return (
    <div className={styles.form} onClick={(e) => e.stopPropagation()}>
      {/* Script file */}
      <div className={styles.field}>
        <label className={styles.label}>Script File {!isEditing && <span className={styles.required}>*</span>}</label>
        <div className={styles.fileRow}>
          <span className={styles.filePath}>
            {scriptPath
              ? scriptPath.split(/[\\/]/).pop()
              : isEditing
              ? button!.scriptPath.split('/').pop()
              : 'No file selected'}
          </span>
          <button className={styles.browseBtn} onClick={() => scriptInputRef.current?.click()}>
            <img src={folderIcon} alt="Browse" width={12} height={12} />
          </button>
          <input
            ref={scriptInputRef}
            type="file"
            accept=".jsx,.jsxbin"
            style={{ display: 'none' }}
            onChange={handleScriptChange}
          />
        </div>
      </div>

      {/* Icon file */}
      <div className={styles.field}>
        <label className={styles.label}>Icon (PNG / JPG / SVG)</label>
        <div className={styles.fileRow}>
          <span className={styles.filePath}>
            {clearIcon
              ? 'Cleared (text icon)'
              : iconPath
              ? iconPath.split(/[\\/]/).pop()
              : isEditing && button!.iconPath
              ? button!.iconPath.split('/').pop()
              : 'Use auto text icon'}
          </span>
          <button className={styles.browseBtn} onClick={() => iconInputRef.current?.click()}>
            <img src={folderIcon} alt="Browse" width={12} height={12} />
          </button>
          {(isEditing && button!.iconPath && !clearIcon) && (
            <button
              className={styles.clearBtn}
              title="Clear icon"
              onClick={() => { setClearIcon(true); setIconPath(null) }}
            >
              <img src={crossIcon} alt="Clear" width={10} height={10} />
            </button>
          )}
          <input
            ref={iconInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,.svg"
            style={{ display: 'none' }}
            onChange={handleIconChange}
          />
        </div>
      </div>

      {/* Name */}
      <div className={styles.field}>
        <label className={styles.label}>Name <span className={styles.required}>*</span></label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Button name"
          maxLength={64}
        />
        {name && (
          <span className={styles.iconPreview}>
            Auto icon: <strong>{buildAutoIconText(name)}</strong>
          </span>
        )}
      </div>

      {/* Description */}
      <div className={styles.field}>
        <label className={styles.label}>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description shown on hover"
          rows={2}
          style={{ resize: 'none', width: '100%' }}
        />
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.footer}>
        <button className={styles.cancelBtn} onClick={onDone}>Cancel</button>
        <button className={styles.saveBtn} onClick={handleSave}>
          {isEditing ? 'Update' : 'Add Button'}
        </button>
      </div>
    </div>
  )
}
