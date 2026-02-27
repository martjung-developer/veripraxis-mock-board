import styles from './dashboard.module.css'

export default function AdminDashboardPage() {
  return (
    <div className={styles.page}>
      <h2 className={styles.pageTitle}>Dashboard</h2>
      <p className={styles.pageBody}>Admin Dashboard content goes here.</p>
    </div>
  )
}
