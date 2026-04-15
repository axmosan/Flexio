import React from 'react'
import { motion } from 'framer-motion'
import type { ConflictInfo, ConflictMode } from '@/shared/types'
import styles from './ImportConflictDialog.module.css'

interface Props {
  info: ConflictInfo
  onResolve: (mode: ConflictMode) => void
}

const OPTIONS: { mode: ConflictMode; label: string; desc: string }[] = [
  {
    mode: 'replace',
    label: 'Replace',
    desc: 'Removes all existing scripts and imports the new scripts from scratch.',
  },
  {
    mode: 'updateAdd',
    label: 'Update & Add',
    desc: 'Keeps unchanged scripts intact, while updating modified scripts and adding new ones.',
  },
  {
    mode: 'addMissing',
    label: 'Add if Missing',
    desc: 'Keeps all existing scripts intact and only adds scripts that are not already present.',
  },
  {
    mode: 'cancel',
    label: 'Cancel',
    desc: '',
  },
]

export function ImportConflictDialog({ info, onResolve }: Props) {
  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={styles.dialog}
        initial={{ scale: 0.95, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        <h3 className={styles.title}>Preset Conflict Detected</h3>
        <p className={styles.subtitle}>
          {info.overlapping.length} script{info.overlapping.length !== 1 ? 's' : ''} already exist:
          {' '}
          <strong>{info.overlapping.slice(0, 3).join(', ')}{info.overlapping.length > 3 ? '…' : ''}</strong>
        </p>
        <div className={styles.options}>
          {OPTIONS.map((opt) => (
            <button
              key={opt.mode}
              className={`${styles.option} ${opt.mode === 'cancel' ? styles.cancel : ''}`}
              onClick={() => onResolve(opt.mode)}
            >
              <span className={styles.optionLabel}>{opt.label}</span>
              {opt.desc && <span className={styles.optionDesc}>{opt.desc}</span>}
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
