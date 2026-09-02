import React, { useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useBlueprints } from '@/shared/context/BlueprintsContext'
import { useButtonDrag } from './ButtonDragContext'
import { ButtonRow } from './ButtonRow'
import { ButtonEditForm } from './ButtonEditForm'
import type { AppName, ButtonDef, ToolsetDef } from '@/shared/types'
import styles from './ToolsetSection.module.css'
import addButtonIcon from '@/shared/assets/svg/add_button.svg'
import editIcon from '@/shared/assets/svg/edit.svg'
import trashIcon from '@/shared/assets/svg/trash.svg'

interface Props {
  app: AppName
  toolset: ToolsetDef
}

// ── Per-item drag wrapper ────────────────────────────────────────
function DraggableRow({
  button, app, toolsetId,
}: {
  button: ButtonDef
  app: AppName
  toolsetId: string
}) {
  const drag = useButtonDrag()

  return (
    <motion.div
      layout
      layoutId={button.id}
      transition={{ duration: 0.18, ease: 'easeInOut' }}
      onPointerEnter={(e) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        drag.hoverRow(toolsetId, button.id, e.clientY > rect.top + rect.height / 2)
      }}
    >
      <ButtonRow
        app={app}
        toolsetId={toolsetId}
        button={button}
        dragging={drag.dragId === button.id}
        dragHandleProps={{
          onPointerDown: (e) => drag.startDrag(button.id, e),
        }}
      />
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export function ToolsetSection({ app, toolset }: Props) {
  const { renameToolset, deleteToolset } = useBlueprints()
  const drag = useButtonDrag()
  const [expanded, setExpanded] = useState(true)
  const [addingButton, setAddingButton] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(toolset.name)
  const nameRef = useRef<HTMLInputElement>(null)

  function commitRename() {
    const trimmed = nameInput.trim()
    if (trimmed && trimmed !== toolset.name) {
      renameToolset(app, toolset.id, trimmed)
    }
    setEditingName(false)
  }

  function handleDeleteToolset() {
    if (window.confirm(`Delete toolset "${toolset.name}" and all its scripts?`)) {
      deleteToolset(app, toolset.id)
    }
  }

  const sorted = [...toolset.buttons].sort((a, b) => a.order - b.order)
  // While a drag runs this is the preview order, which may include a row that
  // still belongs to another toolset.
  const rows = drag.resolveRows(toolset.id, sorted)

  /** A collapsed or empty section still accepts a drop: open it and take the row */
  function handleSectionPointerEnter() {
    if (!drag.dragId) return
    if (!expanded) {
      setExpanded(true)
      drag.hoverToolset(toolset.id)
    } else if (rows.length === 0) {
      drag.hoverToolset(toolset.id)
    }
  }

  return (
    <div className={styles.root}>
      {/* Toolset header */}
      <div className={styles.header} onPointerEnter={handleSectionPointerEnter}>
        <div className={styles.left} onClick={() => setExpanded((v) => !v)}>
          <motion.span
            className={styles.chevron}
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={{ duration: 0.16 }}
          >
            ›
          </motion.span>
          {editingName ? (
            <input
              ref={nameRef}
              className={styles.nameInput}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename()
                if (e.key === 'Escape') setEditingName(false)
              }}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          ) : (
            <span className={styles.name}>{toolset.name}</span>
          )}
        </div>

        <div className={styles.actions}>
          <button
            className={styles.iconBtn}
            onClick={(e) => {
              e.stopPropagation()
              setEditingName(true)
              setNameInput(toolset.name)
            }}
            title="Rename toolset"
          >
            <img src={editIcon} alt="Rename" width={11} height={11} />
          </button>
          <button
            className={`${styles.iconBtn} ${styles.danger}`}
            onClick={(e) => { e.stopPropagation(); handleDeleteToolset() }}
            title="Delete toolset"
          >
            <img src={trashIcon} alt="Delete" width={11} height={11} />
          </button>
        </div>
      </div>

      {/* Buttons list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: 'hidden' }}
          >
            {rows.length === 0 && !addingButton && (
              <div
                className={styles.empty}
                onPointerEnter={() => drag.hoverToolset(toolset.id)}
              >
                No buttons added to {toolset.name}.
              </div>
            )}

            {rows.length > 0 && (
              <div>
                {rows.map((btn) => (
                  <DraggableRow
                    key={btn.id}
                    button={btn}
                    app={app}
                    toolsetId={toolset.id}
                  />
                ))}
              </div>
            )}

            {/* Add button form */}
            <AnimatePresence>
              {addingButton && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  style={{ overflow: 'hidden' }}
                >
                  <ButtonEditForm
                    app={app}
                    toolsetId={toolset.id}
                    onDone={() => setAddingButton(false)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Add button footer — always stays last */}
            {!addingButton && (
              <button
                className={styles.addBtn}
                onClick={() => setAddingButton(true)}
                onPointerEnter={() => drag.hoverToolset(toolset.id)}
              >
                <img src={addButtonIcon} alt="Add" width={11} height={11} />
                <span>Add Button in {toolset.name}</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
