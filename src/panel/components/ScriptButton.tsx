import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { getIconRows, nameToHsl, iconPathToUrl } from '@/shared/lib/iconGenerator'
import { executeScript } from '@/shared/lib/cepInterface'
import { toAbsolutePath } from '@/shared/lib/paths'
import type { AppName, ButtonDef, IconShape, UIMode } from '@/shared/types'
import styles from './ScriptButton.module.css'

interface Props {
  button: ButtonDef
  app: AppName
  scale: number
  uiMode: UIMode
  iconShape: IconShape
}

export function ScriptButton({ button, scale, uiMode, iconShape }: Props) {
  const [running, setRunning] = useState(false)
  const [error,   setError]   = useState(false)

  async function handleClick() {
    if (running) return
    setRunning(true)
    setError(false)
    try {
      const absPath = toAbsolutePath(button.scriptPath)
      const result  = await executeScript(absPath)
      if (result?.startsWith('ERROR')) {
        setError(true)
        setTimeout(() => setError(false), 1500)
      }
    } catch {
      setError(true)
      setTimeout(() => setError(false), 1500)
    } finally {
      setRunning(false)
    }
  }

  const iconUrl   = button.iconType === 'image' ? iconPathToUrl(button.iconPath) : ''
  const [row1, row2] = getIconRows(button.autoIconText)
  const bgColor   = nameToHsl(button.name)
  const iconSize     = uiMode === 'icon+name' ? Math.max(24, Math.round(scale * 0.6)) : scale
  const iconTextSize = scale < 48 ? 9 : scale < 64 ? 11 : 13
  const listFontSize = Math.max(10, Math.round(scale * 0.19))
  const crisp        = iconShape === 'crisp'

  // ── Icon-only grid mode ─────────────────────────────────────────────────
  if (uiMode === 'icon') {
    return (
      <motion.button
        className={`${styles.btn} ${running ? styles.running : ''} ${error ? styles.error : ''}`}
        style={{ width: scale, height: scale }}
        onClick={handleClick}
        whileHover={{ scale: 1.06, filter: 'brightness(1.15)' }}
        whileTap={{ scale: 0.94 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
      >
        <div
          className={`${styles.iconArea} ${crisp ? styles.crisp : ''}`}
          style={{ background: button.iconType === 'text' ? bgColor : 'transparent' }}
        >
          {button.iconType === 'image' && iconUrl ? (
            <img src={iconUrl} alt={button.name} className={styles.iconImg} draggable={false} />
          ) : (
            <div className={styles.textIcon} style={{ fontSize: iconTextSize }}>
              <span>{row1}</span>
              {row2 && <span>{row2}</span>}
            </div>
          )}
        </div>
      </motion.button>
    )
  }

  // ── Icon + Name list mode ───────────────────────────────────────────────
  if (uiMode === 'icon+name') {
    return (
      <motion.button
        className={`${styles.listBtn} ${running ? styles.running : ''} ${error ? styles.error : ''}`}
        onClick={handleClick}
        whileHover={{ backgroundColor: 'var(--surface-hover)' }}
        whileTap={{ scale: 0.98, backgroundColor: 'var(--surface-active)' }}
        transition={{ duration: 0.1, ease: 'easeOut' }}
      >
        {/* Mini icon */}
        <div
          className={styles.listIcon}
          style={{
            width:            iconSize,
            height:           iconSize,
            flexShrink:       0,
            background:       button.iconType === 'text' ? bgColor : 'transparent',
            borderRadius:     crisp ? 0 : 'var(--radius)',
            overflow:         'hidden',
            display:          'flex',
            alignItems:       'center',
            justifyContent:   'center',
          }}
        >
          {button.iconType === 'image' && iconUrl ? (
            <img src={iconUrl} alt={button.name} className={styles.iconImg} draggable={false} />
          ) : (
            <div className={styles.textIcon} style={{ fontSize: Math.max(8, Math.round(iconSize * 0.35)) }}>
              <span>{row1}</span>
              {row2 && <span>{row2}</span>}
            </div>
          )}
        </div>
        {/* Name */}
        <span className={styles.listLabel} style={{ fontSize: listFontSize }}>{button.name}</span>
      </motion.button>
    )
  }

  // ── Name-only list mode ─────────────────────────────────────────────────
  return (
    <motion.button
      className={`${styles.listBtn} ${styles.nameOnly} ${running ? styles.running : ''} ${error ? styles.error : ''}`}
      onClick={handleClick}
      whileHover={{ backgroundColor: 'var(--surface-hover)' }}
      whileTap={{ scale: 0.98, backgroundColor: 'var(--surface-active)' }}
      transition={{ duration: 0.1, ease: 'easeOut' }}
      style={{ fontSize: listFontSize }}
    >
      <span className={styles.listLabel}>{button.name}</span>
    </motion.button>
  )
}
