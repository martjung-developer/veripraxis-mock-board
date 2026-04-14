// components/dashboard/admin/settings/SettingsHeader.tsx
//
// Pure UI — renders the page title block.

import { motion } from 'framer-motion'
import { sectionVariants } from '@/animations/admin/settings/settings'
import s from '@/app/(dashboard)/admin/settings/settings.module.css'
import type { JSX } from 'react'


export function SettingsHeader(): JSX.Element {
  return (
    <motion.div className={s.header} variants={sectionVariants}>
      <div className={s.headerLeft}>
        <h1 className={s.pageTitle}>Settings</h1>
        <p className={s.pageSub}>Manage your profile, security, and preferences.</p>
      </div>
    </motion.div>
  )
}