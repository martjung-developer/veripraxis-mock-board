// components/dashboard/admin/settings/AvatarUploader.tsx
//
// Pure UI — renders the avatar preview, change-photo button, and upload progress bar.
// All upload logic lives in the hook; this component only shows state + fires events.

/* eslint-disable @next/next/no-img-element */
import { useRef } from 'react'
import { Camera } from 'lucide-react'
import { motion } from 'framer-motion'
import { buttonVariants } from '@/animations/admin/settings/settings'
import type { AvatarUploadState } from '@/lib/types/admin/settings/settings.types'
import s from '@/app/(dashboard)/admin/settings/settings.module.css'
import type { JSX } from 'react'

interface AvatarUploaderProps {
  avatarUrl: string | null
  initials: string
  upload: AvatarUploadState
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function AvatarUploader({
  avatarUrl,
  initials,
  upload,
  onFileChange,
}: AvatarUploaderProps): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className={s.avatarUploadRow}>
      {/* Preview */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {avatarUrl
          ? <img src={avatarUrl} alt="avatar" className={s.avatarLg} />
          : <div className={s.avatarFallbackLg}>{initials}</div>
        }
      </div>

      {/* Info + trigger */}
      <div className={s.avatarUploadInfo}>
        <p className={s.avatarUploadTitle}>Profile photo</p>
        <p className={s.avatarUploadHint}>JPG, PNG or WebP · Max 2 MB</p>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={onFileChange}
        />

        <motion.button
          className={s.buttonSecondary}
          onClick={() => fileInputRef.current?.click()}
          disabled={upload.uploading}
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          initial="rest"
          animate="rest"
          style={{ fontSize: '0.75rem', padding: '0.4rem 0.85rem' }}
        >
          {upload.uploading
            ? <><div className={s.spinner} style={{ borderTopColor: 'var(--primary)' }} /> Uploading…</>
            : <><Camera size={13} /> Change photo</>
          }
        </motion.button>

        {/* Progress bar */}
        {upload.uploading && upload.progress > 0 && (
          <div className={s.uploadProgress}>
            <div className={s.uploadProgressFill} style={{ width: `${upload.progress}%` }} />
          </div>
        )}
      </div>
    </div>
  )
}