// apps/web/app/page.tsx
import Link from 'next/link'
import styles from './page.module.css'

export default function HomePage() {
  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <nav className={styles.nav}>
          <div className={styles.logo}>Veripraxis</div>
          <div className={styles.navLinks}>
            <Link href="/login" className={styles.navLink}>Login</Link>
            <Link href="/register" className={styles.navLinkPrimary}>Sign Up</Link>
          </div>
        </nav>
      </header>

      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.heroTitle}>Ace Your Board Exams with Confidence</h1>
          <p className={styles.heroSubtitle}>
            Practice with realistic mock exams, track your progress, and prepare for success
            in your Licensure Examinations.
          </p>
          <div className={styles.heroActions}>
            <Link href="/register" className={styles.btnPrimary}>Get Started Free</Link>
            <Link href="/exams" className={styles.btnOutline}>Browse Exams</Link>
          </div>
        </div>

        <div className={styles.featuresGrid}>
          {[
            { icon: '📝', title: 'Realistic Practice Exams', desc: 'Take mock exams that simulate the actual board exam experience' },
            { icon: '📊', title: 'Detailed Analytics', desc: 'Track your performance and identify areas for improvement' },
            { icon: '📚', title: 'Study Materials', desc: 'Access comprehensive reviewers and study guides' },
          ].map((f) => (
            <div key={f.title} className={styles.featureCard}>
              <div className={styles.featureIcon}>{f.icon}</div>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>

        <div className={styles.programs}>
          <h2 className={styles.programsTitle}>Available Programs</h2>
          <div className={styles.programsGrid}>
            {[
              { name: 'SBIT', desc: 'Library & Information Science' },
              { name: 'SSLATE', desc: 'Education, Psychology, Liberal Arts' },
              { name: 'SARFAID', desc: 'Architecture & Interior Design' },
            ].map((p) => (
              <div key={p.name} className={styles.programCard}>
                <h4 className={styles.programName}>{p.name}</h4>
                <p className={styles.programDesc}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <p>&copy; 2026 Veripraxis. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}