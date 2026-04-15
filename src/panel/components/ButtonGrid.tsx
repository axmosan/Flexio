import React from 'react'
import { ScriptButton } from './ScriptButton'
import { AddButtonCell } from './AddButtonCell'
import type { AppName, ButtonDef } from '@/shared/types'
import styles from './ButtonGrid.module.css'

interface Props {
  buttons: ButtonDef[]
  app: AppName
  buttonScale: number
  buttonSpacing: number
}

export function ButtonGrid({ buttons, app, buttonScale, buttonSpacing }: Props) {
  const sorted = [...buttons].sort((a, b) => a.order - b.order)

  return (
    <div
      className={styles.grid}
      style={{ gap: buttonSpacing }}
    >
      {sorted.map((btn) => (
        <ScriptButton
          key={btn.id}
          button={btn}
          app={app}
          size={buttonScale}
        />
      ))}
      <AddButtonCell size={buttonScale} app={app} />
    </div>
  )
}
