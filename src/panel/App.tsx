import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useBlueprints } from '@/shared/context/BlueprintsContext'
import { getHostApp, getPanelSlot, openSettingsWindow } from '@/shared/lib/cepInterface'
import { ButtonGrid } from './components/ButtonGrid'
import { SettingsGear } from './components/SettingsGear'
import styles from './App.module.css'

export default function App() {
  const { blueprints, isLoaded } = useBlueprints()
  const app = getHostApp()
  const slot = getPanelSlot()

  const toolsetId = blueprints.allocation[app][slot]
  const toolset = useMemo(
    () => blueprints.apps[app].toolsets.find((ts) => ts.id === toolsetId) ?? null,
    [blueprints, app, toolsetId],
  )

  const { scale, spacing, flipToReorder, uiMode, iconShape, columns } = blueprints.panelSettings[slot]

  if (!isLoaded) return null

  return (
    <div className={styles.root}>
      <motion.div
        className={styles.content}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        {toolset ? (
          <ButtonGrid
            buttons={toolset.buttons}
            app={app}
            toolsetId={toolsetId}
            scale={scale}
            spacing={spacing}
            flipToReorder={flipToReorder}
            uiMode={uiMode}
            iconShape={iconShape}
            columns={columns}
          />
        ) : (
          <div className={styles.empty}>
            <span className={styles.emptyText}>
              No toolset assigned.
              <br />
              Open settings to configure.
            </span>
          </div>
        )}
      </motion.div>

      <SettingsGear onClick={() => openSettingsWindow(app, slot)} />
    </div>
  )
}
