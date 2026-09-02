import React, { useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { useBlueprints } from '@/shared/context/BlueprintsContext'
import { APP_NAMES, APP_DISPLAY_NAMES } from '@/shared/types'
import type { AppName, ToolsetDef } from '@/shared/types'
import { ToolsetSection } from '../components/ToolsetSection'
import { ButtonDragProvider } from '../components/ButtonDragContext'
import styles from './ButtonsTab.module.css'

// App icon imports
import aeIcon from '@/shared/assets/svg/Adobe_After_Effects_CC_icon.svg'
import prIcon from '@/shared/assets/svg/Adobe_Premiere_Pro_CC_icon.svg'
import psIcon from '@/shared/assets/svg/Adobe_Photoshop_CC_icon.svg'
import aiIcon from '@/shared/assets/svg/Adobe_Illustrator_CC_icon.svg'
import addToolsetIcon from '@/shared/assets/svg/add_toolset.svg'

const APP_ICONS: Record<AppName, string> = {
  AfterEffects: aeIcon,
  PremierePro: prIcon,
  Photoshop: psIcon,
  Illustrator: aiIcon,
}

interface Props {
  initialApp: AppName
}

export function ButtonsTab({ initialApp }: Props) {
  const { blueprints, addToolset } = useBlueprints()
  const [expandedApps, setExpandedApps] = useState<Set<AppName>>(new Set([initialApp]))

  // Put the current app first in the list
  const sortedApps: AppName[] = [
    initialApp,
    ...APP_NAMES.filter((a) => a !== initialApp),
  ]

  function toggleApp(app: AppName) {
    setExpandedApps((prev) => {
      const next = new Set(prev)
      if (next.has(app)) next.delete(app)
      else next.add(app)
      return next
    })
  }

  function handleAddToolset(app: AppName) {
    const name = `Toolset ${blueprints.apps[app].toolsets.length + 1}`
    addToolset(app, name)
    setExpandedApps((prev) => new Set([...prev, app]))
  }

  return (
    <div className={styles.root}>
      {sortedApps.map((app) => {
        const isExpanded = expandedApps.has(app)
        const toolsets = blueprints.apps[app].toolsets

        return (
          <div key={app} className={styles.appBlock}>
            {/* App header row */}
            <div className={styles.appHeader} onClick={() => toggleApp(app)}>
              <div className={styles.appLeft}>
                <motion.span
                  className={styles.chevron}
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.18 }}
                >
                  ›
                </motion.span>
                <img src={APP_ICONS[app]} alt={app} className={styles.appIcon} />
                <span className={styles.appName}>{APP_DISPLAY_NAMES[app]}</span>
              </div>
              <button
                className={styles.addToolsetBtn}
                onClick={(e) => {
                  e.stopPropagation()
                  handleAddToolset(app)
                  setExpandedApps((prev) => new Set([...prev, app]))
                }}
                title="Add Toolset"
              >
                <img src={addToolsetIcon} alt="Add Toolset" width={12} height={12} />
                <span>Add Toolset</span>
              </button>
            </div>

            {/* Toolsets (animated) */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeInOut' }}
                  style={{ overflow: 'hidden' }}
                >
                  {toolsets.length === 0 ? (
                    <div className={styles.noToolsets}>No toolsets yet.</div>
                  ) : (
                    /* One drag context per app: rows travel between this app's
                       toolsets, never into another app's. */
                    <ButtonDragProvider app={app}>
                      <LayoutGroup id={app}>
                        {toolsets.map((ts) => (
                          <ToolsetSection key={ts.id} app={app} toolset={ts} />
                        ))}
                      </LayoutGroup>
                    </ButtonDragProvider>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
