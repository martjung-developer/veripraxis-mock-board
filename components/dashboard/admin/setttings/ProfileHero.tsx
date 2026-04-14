// components/dashboard/admin/settings/ProfileHero.tsx
//
// Pure UI — renders the dark hero card showing avatar, name, email, and role badge.

/* eslint-disable @next/next/no-img-element */
import { Shield } from 'lucide-react'
import { motion } from 'framer-motion'
import { avatarVariants, sectionVariants } from '@/animations/admin/settings/settings'
import type { Profile } from '@/lib/types/admin/settings/settings.types'
import s from '@/app/(dashboard)/admin/settings/settings.module.css'
import type { JSX } from 'react'

interface ProfileHeroProps {
  profile: Profile
  avatarUrl: string | null
  initials: string
}

export function ProfileHero({ profile, avatarUrl, initials }: ProfileHeroProps): JSX.Element {
  return (
    <motion.div className={s.profileHero} variants={sectionVariants}>
      <motion.div
        className={s.avatarWrapper}
        variants={avatarVariants}
        whileHover="hover"
        initial="visible"
        animate="visible"
      >
        {avatarUrl
          ? <img src={avatarUrl} alt={profile.full_name ?? 'Avatar'} className={s.avatar} />
          : <div className={s.avatarFallback}>{initials}</div>
        }
      </motion.div>

      <div className={s.heroInfo}>
        <h2 className={s.heroName}>{profile.full_name || 'No name set'}</h2>
        <p className={s.heroEmail}>{profile.email}</p>
        <span className={s.heroBadge}>
          <Shield size={10} />
          {profile.role === 'admin' ? 'Administrator' : 'Faculty'}
        </span>
      </div>
    </motion.div>
  )
}