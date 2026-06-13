import React, { useState, useRef } from 'react'
import { AnimatePresence, motion, Reorder, useDragControls } from 'framer-motion'
import { useBlueprints } from '@/shared/context/BlueprintsContext'
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

// ── Per-item drag wrapper (useDragControls must be in its own component) ──────
function DraggableRow({
  button, app, toolsetId,
}: {
  button: ButtonDef
  app: AppName
  toolsetId: string
}) {
  const controls = useDragControls()

  return (
    <Reorder.Item
      as="div"
      value={button.id}
      dragListener={false}
      dragControls={controls}
      layout
      layoutId={button.id}
      transition={{ duration: 0.18, ease: 'easeInOut' }}
    >
      <ButtonRow
        app={app}
        toolsetId={toolsetId}
        button={button}
        dragHandleProps={{
          onPointerDown: (e) => {
            e.preventDefault()
            controls.start(e)
          },
        }}
      />
    </Reorder.Item>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export function ToolsetSection({ app, toolset }: Props) {
  const { renameToolset, deleteToolset, reorderButtons } = useBlueprints()
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

  return (
    <div className={styles.root}>
      {/* Toolset header */}
      <div className={styles.header}>
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
            {sorted.length === 0 && !addingButton && (
              <div className={styles.empty}>No buttons added to {toolset.name}.</div>
            )}

            {sorted.length > 0 && (
              <Reorder.Group
                as="div"
                axis="y"
                values={sorted.map((b) => b.id)}
                onReorder={(newIds) => reorderButtons(app, toolset.id, newIds)}
                style={{ listStyle: 'none', padding: 0, margin: 0 }}
              >
                {sorted.map((btn) => (
                  <DraggableRow
                    key={btn.id}
                    button={btn}
                    app={app}
                    toolsetId={toolset.id}
                  />
                ))}
              </Reorder.Group>
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
