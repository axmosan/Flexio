import React from 'react'
import styles from './AboutTab.module.css'

export function AboutTab() {
  return (
    <div className={styles.root}>
      <h1 className={styles.title}>FLEXIO</h1>
      <p className={styles.version}>v1.0.0</p>

      <p className={styles.body}>
        Copyright (C) 2026 Nakano Sho
      </p>

      <p className={styles.body}>
        This program is free software; you can redistribute it and/or modify
        it under the terms of the GNU General Public License as published by
        the Free Software Foundation, either version 3 of the License, or
        (at your option) any later version.
      </p>

      <p className={styles.body}>
        This program is distributed in the hope that it will be useful,
        but WITHOUT ANY WARRANTY; without even the implied warranty of
        MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
        GNU General Public License for more details.
      </p>

      <p className={styles.body}>
        You should have received a copy of the GNU General Public License
        along with this program. If not, see{' '}
        <span className={styles.link}>&lt;https://www.gnu.org/licenses/&gt;</span>.
      </p>
    </div>
  )
}
