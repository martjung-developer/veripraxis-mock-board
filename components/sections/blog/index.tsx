'use client'

import styles from './blog-section.module.css'

export default function BlogSection() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <h2 className={styles.title}>BlogSection</h2>
        <p className={styles.body}>Section content goes here.</p>
      </div>
    </section>
  )
}
