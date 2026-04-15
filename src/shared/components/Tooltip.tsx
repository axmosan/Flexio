import React, { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import styles from './Tooltip.module.css'

interface TooltipProps {
  title: string
  description?: string
  children: React.ReactNode
  placement?: 'top' | 'bottom' | 'right'
}

export function Tooltip({ title, description, children, placement = 'bottom' }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function show() {
    timerRef.current = setTimeout(() => setVisible(true), 400)
  }

  function hide() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
  }

  return (
    <div
      className={styles.wrapper}
      onMouseEnter={show}
      onMouseLeave={hide}
      onMouseDown={hide}
    >
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            className={`${styles.tooltip} ${styles[placement]}`}
            initial={{ opacity: 0, y: placement === 'top' ? 4 : -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <div className={styles.title}>{title}</div>
            {description && <div className={styles.desc}>{description}</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
