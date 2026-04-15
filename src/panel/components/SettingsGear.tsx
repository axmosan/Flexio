import React from 'react'
import { motion } from 'framer-motion'
import styles from './SettingsGear.module.css'
import settingIcon from '@/shared/assets/svg/setting.svg'

interface Props {
  onClick: () => void
}

export function SettingsGear({ onClick }: Props) {
  return (
    <motion.button
      className={styles.gear}
      onClick={onClick}
      whileHover={{ rotate: 45, scale: 1.15 }}
      whileTap={{ scale: 0.9 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      title="Flexio Settings"
    >
      <img src={settingIcon} alt="Settings" width={14} height={14} />
    </motion.button>
  )
}
