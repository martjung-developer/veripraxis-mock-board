'use client'

import styles from './about-section.module.css'

export default function AboutSection() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <h2 className={styles.title}>AboutSection</h2>
        <p className={styles.body}>Section content goes here.</p>
      </div>
    </section>
  )
}
