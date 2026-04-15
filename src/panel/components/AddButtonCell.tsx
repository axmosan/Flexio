import React from 'react'
import { motion } from 'framer-motion'
import { getHostApp, getPanelSlot, openSettingsWindow } from '@/shared/lib/cepInterface'
import type { AppName } from '@/shared/types'
import styles from './AddButtonCell.module.css'

interface Props {
  size: number
  app: AppName
}

export function AddButtonCell({ size, app }: Props) {
  const slot = getPanelSlot()

  return (
    <motion.button
      className={styles.btn}
      style={{ width: size, height: size }}
      onClick={() => openSettingsWindow(app, slot)}
      whileHover={{ scale: 1.06, borderColor: 'var(--accent)' }}
      whileTap={{ scale: 0.94 }}
      transition={{ duration: 0.12 }}
      title="Add script button"
    >
      <div className={styles.iconArea}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 4v12M4 10h12" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </motion.button>
  )
}
