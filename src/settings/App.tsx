import React, { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useBlueprints } from '@/shared/context/BlueprintsContext'
import { ButtonsTab } from './tabs/ButtonsTab'
import { SettingsTab } from './tabs/SettingsTab'
import { AboutTab } from './tabs/AboutTab'
import type { AppName } from '@/shared/types'
import styles from './App.module.css'

type Tab = 'buttons' | 'settings' | 'about'

const VALID_APPS: AppName[] = ['AfterEffects', 'PremierePro', 'Illustrator', 'Photoshop']

/**
 * Determine the initial app to show in settings.
 * Priority: URL param → localStorage (set by panel via requestOpenExtension) → default
 */
function getInitialApp(): AppName {
  // 1. URL param (window.open path)
  const p = new URLSearchParams(window.location.search)
  const fromUrl = p.get('app')
  if (fromUrl && VALID_APPS.includes(fromUrl as AppName)) return fromUrl as AppName

  // 2. localStorage (requestOpenExtension path)
  try {
    const ctx = JSON.parse(localStorage.getItem('flexio_settings_ctx') ?? '{}')
    if (ctx.app && VALID_APPS.includes(ctx.app)) return ctx.app as AppName
  } catch { /* ignore */ }

  return 'AfterEffects'
}

export default function App() {
  const { isLoaded } = useBlueprints()
  const [tab, setTab] = useState<Tab>('buttons')
  const [initialApp] = useState<AppName>(getInitialApp)

  if (!isLoaded) {
    return (
      <div className={styles.loading}>
        <span>Loading…</span>
      </div>
    )
  }

  return (
    <div className={styles.root}>
      {/* Sidebar */}
      <nav className={styles.sidebar}>
        {(['buttons', 'settings', 'about'] as Tab[]).map((t) => (
          <button
            key={t}
            className={`${styles.navItem} ${tab === t ? styles.active : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>

      {/* Main content */}
      <div className={styles.main}>
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            className={styles.tabContent}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {tab === 'buttons' && <ButtonsTab initialApp={initialApp} />}
            {tab === 'settings' && <SettingsTab />}
            {tab === 'about' && <AboutTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
