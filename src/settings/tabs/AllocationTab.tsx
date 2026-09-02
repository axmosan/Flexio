import React, { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useBlueprints } from '@/shared/context/BlueprintsContext'
import { APP_NAMES, APP_DISPLAY_NAMES, PANEL_SLOTS } from '@/shared/types'
import type { AppName, IconShape, PanelSlot, UIMode } from '@/shared/types'
import { getHostApp, isCEP } from '@/shared/lib/cepInterface'
import styles from './AllocationTab.module.css'
import iconOnlySvg     from '@/shared/assets/svg/mode_icon.svg'
import iconNameSvg     from '@/shared/assets/svg/mode_icon_name.svg'
import nameOnlySvg     from '@/shared/assets/svg/mode_name.svg'
import shapeCrispSvg   from '@/shared/assets/svg/shape_crisp.svg'
import shapeRoundedSvg from '@/shared/assets/svg/shape_rounded.svg'

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

const PANEL_LABELS: Record<PanelSlot, string> = {
  panel1: 'Flexio 1',
  panel2: 'Flexio 2',
  panel3: 'Flexio 3',
  panel4: 'Flexio 4',
}

const COLUMN_OPTIONS = [
  { value: 0, label: 'AUTO' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
  { value: 6, label: '6' },
]

const UI_MODES: { mode: UIMode; icon: string; label: string }[] = [
  { mode: 'icon',      icon: iconOnlySvg,  label: 'Icon' },
  { mode: 'icon+name', icon: iconNameSvg,  label: 'Icon + Name' },
  { mode: 'name',      icon: nameOnlySvg,  label: 'Name' },
]

const ICON_SHAPES: { shape: IconShape; icon: string; label: string }[] = [
  { shape: 'crisp',   icon: shapeCrispSvg,   label: 'Crisp' },
  { shape: 'rounded', icon: shapeRoundedSvg, label: 'Rounded' },
]

interface Props {
  initialApp: AppName
}

export function AllocationTab({ initialApp }: Props) {
  const { blueprints, updatePanelSettings, updateAllocation } = useBlueprints()
  const [activeApp,   setActiveApp]   = useState<AppName>(initialApp ?? getInitialApp())
  const [expanded,    setExpanded]    = useState<Record<PanelSlot, boolean>>({
    panel1: false, panel2: false, panel3: false, panel4: false,
  })

  function togglePanel(slot: PanelSlot) {
    setExpanded((prev) => ({ ...prev, [slot]: !prev[slot] }))
  }

  return (
    <div className={styles.root}>
      {/* App selector — top right */}
      <div className={styles.appSelectorRow}>
        <select
          value={activeApp}
          onChange={(e) => setActiveApp(e.target.value as AppName)}
          className={styles.appSelect}
        >
          {APP_NAMES.map((a) => (
            <option key={a} value={a}>{APP_DISPLAY_NAMES[a]}</option>
          ))}
        </select>
      </div>

      {/* Per-panel collapsible sections */}
      {PANEL_SLOTS.map((slot) => {
        const ps       = blueprints.panelSettings[activeApp][slot]
        const toolsets = blueprints.apps[activeApp].toolsets
        const isOpen   = expanded[slot]

        return (
          <div key={slot} className={styles.panel}>
            {/* Panel header / toggle */}
            <button
              className={styles.panelHeader}
              onClick={() => togglePanel(slot)}
            >
              <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>▶</span>
              <span className={styles.panelLabel}>{PANEL_LABELS[slot]}</span>
            </button>

            {isOpen && (
              <div className={styles.panelBody}>
                {/* UI mode selector + icon shape selector */}
                <div className={styles.modeGroup}>
                  <div className={styles.modeRow}>
                    {UI_MODES.map(({ mode, icon, label }) => (
                      <button
                        key={mode}
                        className={`${styles.modeBtn} ${ps.uiMode === mode ? styles.modeBtnActive : ''}`}
                        onClick={() => updatePanelSettings(activeApp, slot, { uiMode: mode })}
                      >
                        <img src={icon} alt={label} width={16} height={16} className={styles.modeIcon} />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Icon shape — only shown while icons are visible */}
                  <AnimatePresence initial={false}>
                    {ps.uiMode !== 'name' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div className={styles.shapeRow}>
                          {ICON_SHAPES.map(({ shape, icon, label }) => (
                            <button
                              key={shape}
                              className={`${styles.modeBtn} ${ps.iconShape === shape ? styles.modeBtnActive : ''}`}
                              onClick={() => updatePanelSettings(activeApp, slot, { iconShape: shape })}
                            >
                              <img src={icon} alt={label} width={16} height={16} className={styles.modeIcon} />
                              <span>{label}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Toolkit + Columns */}
                <div className={styles.fieldRow}>
                  <label className={styles.fieldLabel}>Toolkit</label>
                  <div className={styles.toolkitRow}>
                    <select
                      value={blueprints.allocation[activeApp][slot]}
                      onChange={(e) => updateAllocation(activeApp, { [slot]: e.target.value })}
                      className={styles.toolkitSelect}
                    >
                      <option value="">— Unassigned —</option>
                      {toolsets.map((ts) => (
                        <option key={ts.id} value={ts.id}>{ts.name}</option>
                      ))}
                    </select>
                    <select
                      value={ps.columns}
                      onChange={(e) => updatePanelSettings(activeApp, slot, { columns: Number(e.target.value) })}
                      className={styles.colSelect}
                      disabled={ps.uiMode !== 'icon'}
                      title={ps.uiMode !== 'icon' ? 'Column count only applies in Icon mode' : undefined}
                    >
                      {COLUMN_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Scale */}
                <div className={styles.sliderGroup}>
                  <div className={styles.sliderHeader}>
                    <span className={styles.sliderLabel}>Scale</span>
                    <span className={styles.sliderValue}>{ps.scale}px</span>
                  </div>
                  <input
                    type="range"
                    min={10} max={128}
                    value={ps.scale}
                    onChange={(e) => updatePanelSettings(activeApp, slot, { scale: Number(e.target.value) })}
                    className={styles.slider}
                  />
                </div>

                {/* Spacing */}
                <div className={styles.sliderGroup}>
                  <div className={styles.sliderHeader}>
                    <span className={styles.sliderLabel}>Spacing</span>
                    <span className={styles.sliderValue}>{ps.spacing}px</span>
                  </div>
                  <input
                    type="range"
                    min={0} max={32}
                    value={ps.spacing}
                    onChange={(e) => updatePanelSettings(activeApp, slot, { spacing: Number(e.target.value) })}
                    className={styles.slider}
                  />
                </div>

                {/* Flip to Reorder */}
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>Flip to Reorder</span>
                  <button
                    className={`${styles.toggleBtn} ${ps.flipToReorder ? styles.toggleOn : ''}`}
                    onClick={() => updatePanelSettings(activeApp, slot, { flipToReorder: !ps.flipToReorder })}
                    role="switch"
                    aria-checked={ps.flipToReorder}
                  >
                    <span className={styles.toggleThumb} />
                  </button>
                </div>
              </div>
            )}

            <div className={styles.panelDivider} />
          </div>
        )
      })}
    </div>
  )
}
