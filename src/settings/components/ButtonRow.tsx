import React, { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useBlueprints } from '@/shared/context/BlueprintsContext'
import { ButtonEditForm } from './ButtonEditForm'
import { getIconRows, nameToHsl, iconPathToUrl } from '@/shared/lib/iconGenerator'
import type { AppName, ButtonDef } from '@/shared/types'
import styles from './ButtonRow.module.css'
import editIcon from '@/shared/assets/svg/edit.svg'
import duplicateIcon from '@/shared/assets/svg/duplicate.svg'
import trashIcon from '@/shared/assets/svg/trash.svg'
import dragHandleIcon from '@/shared/assets/svg/drag_handle.svg'
import eyeIcon from '@/shared/assets/svg/eye.svg'
import eyeOffIcon from '@/shared/assets/svg/eye_off.svg'

interface Props {
  app: AppName
  toolsetId: string
  button: ButtonDef
  /** True while this row is the one being dragged */
  dragging?: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}

export function ButtonRow({ app, toolsetId, button, dragging, dragHandleProps }: Props) {
  const { deleteButton, duplicateButton, setButtonHidden } = useBlueprints()
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)

  const [row1, row2] = getIconRows(button.autoIconText)
  const iconUrl = button.iconType === 'image' ? iconPathToUrl(button.iconPath) : ''
  const bgColor = nameToHsl(button.name)
  const isHidden = button.hidden === true

  function handleDelete() {
    if (window.confirm(`Delete "${button.name}"?`)) {
      deleteButton(app, toolsetId, button.id)
    }
  }

  function handleDuplicate() {
    duplicateButton(app, toolsetId, button.id)
  }

  return (
    <div className={`${styles.root} ${isHidden ? styles.hiddenRow : ''}`}>
      {/* Button summary row */}
      <div
        className={`${styles.row} ${dragging ? styles.dragging : ''}`}
        onClick={() => { setExpanded((v) => !v); setEditing(false) }}
      >
        {/* Drag handle */}
        <div
          className={styles.dragHandle}
          onClick={(e) => e.stopPropagation()}
          {...dragHandleProps}
        >
          <img src={dragHandleIcon} alt="" width={8} height={14} />
        </div>
        {/* Mini icon preview */}
        <div className={styles.miniIcon} style={{ background: button.iconType === 'text' ? bgColor : 'transparent' }}>
          {button.iconType === 'image' && iconUrl ? (
            <img src={iconUrl} alt="" className={styles.miniImg} />
          ) : (
            <span className={styles.miniText}>
              {row1}{row2 ? `\n${row2}` : ''}
            </span>
          )}
        </div>
        <span className={styles.name}>{button.name}</span>
        {/* Panel visibility — the button stays in the toolset either way */}
        <button
          className={`${styles.eyeBtn} ${isHidden ? styles.eyeOff : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            setButtonHidden(app, toolsetId, button.id, !isHidden)
          }}
          title={isHidden ? 'Hidden from the panel — click to show' : 'Shown in the panel — click to hide'}
        >
          <img src={isHidden ? eyeOffIcon : eyeIcon} alt="" width={13} height={13} />
        </button>
        <motion.span
          className={styles.chevron}
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={{ duration: 0.15 }}
        >
          ›
        </motion.span>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: 'hidden' }}
          >
            {editing ? (
              <ButtonEditForm
                app={app}
                toolsetId={toolsetId}
                button={button}
                onDone={() => setEditing(false)}
              />
            ) : (
              <div className={styles.detail}>
                {button.description && (
                  <p className={styles.description}>{button.description}</p>
                )}
                <div className={styles.actionRow}>
                  <button
                    className={styles.actionBtn}
                    onClick={(e) => { e.stopPropagation(); setEditing(true) }}
                  >
                    <img src={editIcon} alt="" width={11} height={11} />
                    Edit
                  </button>
                  <button
                    className={styles.actionBtn}
                    onClick={(e) => { e.stopPropagation(); handleDuplicate() }}
                  >
                    <img src={duplicateIcon} alt="" width={11} height={11} />
                    Duplicate
                  </button>
                  <button
                    className={`${styles.actionBtn} ${styles.danger}`}
                    onClick={(e) => { e.stopPropagation(); handleDelete() }}
                  >
                    <img src={trashIcon} alt="" width={11} height={11} />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
