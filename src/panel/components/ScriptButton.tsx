import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Tooltip } from '@/shared/components/Tooltip'
import { getIconRows, nameToHsl, iconPathToUrl } from '@/shared/lib/iconGenerator'
import { executeScript } from '@/shared/lib/cepInterface'
import { toAbsolutePath } from '@/shared/lib/paths'
import type { AppName, ButtonDef } from '@/shared/types'
import styles from './ScriptButton.module.css'

interface Props {
  button: ButtonDef
  app: AppName
  size: number
}

export function ScriptButton({ button, size }: Props) {
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(false)

  async function handleClick() {
    if (running) return
    setRunning(true)
    setError(false)
    try {
      const absPath = toAbsolutePath(button.scriptPath)
      const result = await executeScript(absPath)
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

  const iconUrl = button.iconType === 'image' ? iconPathToUrl(button.iconPath) : ''
  const [row1, row2] = getIconRows(button.autoIconText)
  const bgColor = nameToHsl(button.name)

  return (
    <Tooltip title={button.name} description={button.description} placement="bottom">
      <motion.button
        className={`${styles.btn} ${running ? styles.running : ''} ${error ? styles.error : ''}`}
        style={{ width: size, height: size }}
        onClick={handleClick}
        whileHover={{ scale: 1.06, filter: 'brightness(1.15)' }}
        whileTap={{ scale: 0.94 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        title=""
      >
        <div
          className={styles.iconArea}
          style={{ background: button.iconType === 'text' ? bgColor : 'transparent' }}
        >
          {button.iconType === 'image' && iconUrl ? (
            <img
              src={iconUrl}
              alt={button.name}
              className={styles.iconImg}
              draggable={false}
            />
          ) : (
            <div className={styles.textIcon} style={{ fontSize: size < 48 ? 9 : size < 64 ? 11 : 13 }}>
              <span>{row1}</span>
              {row2 && <span>{row2}</span>}
            </div>
          )}
        </div>
      </motion.button>
    </Tooltip>
  )
}
