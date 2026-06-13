import React, { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useBlueprints } from '@/shared/context/BlueprintsContext'
import { ButtonsTab } from './tabs/ButtonsTab'
import { AllocationTab } from './tabs/AllocationTab'
import { SettingsTab } from './tabs/SettingsTab'
import { getHostApp, isCEP } from '@/shared/lib/cepInterface'
import type { AppName } from '@/shared/types'
import styles from './App.module.css'

declare const __APP_VERSION__: string

type Tab = 'buttons' | 'allocation' | 'settings'

const VALID_APPS: AppName[] = ['AfterEffects', 'PremierePro', 'Illustrator', 'Photoshop']

function getInitialApp(): AppName {
  if (isCEP()) return getHostApp()
  const p = new URLSearchParams(window.location.search)
  const fromUrl = p.get('app')
  if (fromUrl && VALID_APPS.includes(fromUrl as AppName)) return fromUrl as AppName
  try {
    const ctx = JSON.parse(localStorage.getItem('flexio_settings_ctx') ?? '{}')
    if (ctx.app && VALID_APPS.includes(ctx.app)) return ctx.app as AppName
  } catch { /* ignore */ }
  return 'AfterEffects'
}

const TAB_LABELS: Record<Tab, string> = {
  buttons:    'Buttons',
  allocation: 'Allocation',
  settings:   'Settings',
}

export default function App() {
  const { isLoaded } = useBlueprints()
  const [tab, setTab] = useState<Tab>('buttons')
  const [initialApp]  = useState<AppName>(getInitialApp)

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
        <div className={styles.navItems}>
          {(['buttons', 'allocation', 'settings'] as Tab[]).map((t) => (
            <button
              key={t}
              className={`${styles.navItem} ${tab === t ? styles.active : ''}`}
              onClick={() => setTab(t)}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
        <div className={styles.version}>v{__APP_VERSION__}</div>
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
            {tab === 'buttons'    && <ButtonsTab initialApp={initialApp} />}
            {tab === 'allocation' && <AllocationTab initialApp={initialApp} />}
            {tab === 'settings'   && <SettingsTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
