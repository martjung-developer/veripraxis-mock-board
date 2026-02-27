'use client'

import styles from './help-section.module.css'

export default function HelpSection() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <h2 className={styles.title}>HelpSection</h2>
        <p className={styles.body}>Section content goes here.</p>
      </div>
    </section>
  )
}
