'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import styles from '@/app/page.module.css'

const NAV_LINKS = [
  { label: 'Features',  href: '#features'  },
  { label: 'Programs',  href: '#programs'  },
  { label: 'Pricing',   href: '#pricing'   },
  { label: 'FAQ',       href: '#faq'       },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navClass = [
    styles.navbar,
    scrolled ? styles.navbarScrolled : '',
  ].join(' ')

  return (
    <header className={navClass}>
      <div className={styles.navInner}>
        {/* Logo — image only, no text */}
        <Link href="/" className={styles.navLogo} aria-label="Veripraxis home">
          <Image
            src="/images/veripraxis-logo.png"
            alt="Veripraxis"
            width={140}
            height={40}
            className={styles.navLogoImg}
            priority
          />
        </Link>

        {/* Desktop center links */}
        <nav className={styles.navCenter} aria-label="Main navigation">
          {NAV_LINKS.map(({ label, href }) => (
            <Link key={label} href={href} className={styles.navLink}>
              {label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA buttons */}
        <div className={styles.navActions}>
          <Link href="/login" className={styles.navLoginBtn}>
            Log in
          </Link>
          <Link href="/register" className={styles.navSignupBtn}>
            Sign Up
          </Link>

          {/* Hamburger (mobile) */}
          <button
            className={`${styles.navHamburger} ${mobileOpen ? styles.navMobileOpen : ''}`}
            onClick={() => setMobileOpen((o) => !o)}
            aria-expanded={mobileOpen}
            aria-label="Toggle navigation"
          >
            <span className={styles.hamburgerLine} />
            <span className={styles.hamburgerLine} />
            <span className={styles.hamburgerLine} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`${styles.mobileMenu} ${mobileOpen ? styles.mobileMenuOpen : ''}`}>
        {NAV_LINKS.map(({ label, href }) => (
          <Link
            key={label}
            href={href}
            className={styles.mobileNavLink}
            onClick={() => setMobileOpen(false)}
          >
            {label}
          </Link>
        ))}
        <div className={styles.mobileDivider} />
        <Link href="/login" className={styles.mobileNavLink} onClick={() => setMobileOpen(false)}>
          Log in
        </Link>
        <Link href="/register" className={styles.mobileSignupBtn} onClick={() => setMobileOpen(false)}>
          Sign Up Free
        </Link>
      </div>
    </header>
  )
}