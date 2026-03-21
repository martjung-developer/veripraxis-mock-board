// src/animations/auth/authAnimations.ts
// Animations for auth pages (login ↔ signup swap).
// Kept deliberately light — 2 animation types max to avoid delay buildup.

import type { Variants } from 'framer-motion'

// ── Full panel slide (counterclockwise swap) ──────────────────────────────────
// When switching Login → Signup:
//   • Form panel slides OUT to the RIGHT, new form slides IN from the LEFT
//   • Photo panel slides OUT to the LEFT, new photo slides IN from the RIGHT
// This creates a counterclockwise "swap sides" feel.

export const formSwapVariants: Variants = {
  hidden:  { x: '-100%', opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.48, ease: [0.4, 0, 0.2, 1] },
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: { duration: 0.35, ease: [0.4, 0, 1, 1] },
  },
}

export const formSwap = {
  variants: formSwapVariants,
  initial:  'hidden',
  animate:  'visible',
  exit:     'exit',
} as const

// Photo slides in the opposite direction to the form
export const photoPanelVariants: Variants = {
  hidden:  { x: '100%', opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.48, ease: [0.4, 0, 0.2, 1] },
  },
  exit: {
    x: '-100%',
    opacity: 0,
    transition: { duration: 0.35, ease: [0.4, 0, 1, 1] },
  },
}

export const photoPanel = {
  variants: photoPanelVariants,
  initial:  'hidden',
  animate:  'visible',
  exit:     'exit',
} as const

// ── Photo panel crossfade ─────────────────────────────────────────────────────
// The right-side photo fades between login and signup photos when toggling.

export const photoSwapVariants: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.55, ease: 'easeInOut' } },
  exit:    { opacity: 0, transition: { duration: 0.3,  ease: 'easeInOut' } },
}

export const photoSwap = {
  variants: photoSwapVariants,
  initial:  'hidden',
  animate:  'visible',
  exit:     'exit',
} as const

// ── Submit button micro-interaction ──────────────────────────────────────────
// Shared hover/tap for all auth submit buttons. Import and spread onto <motion.button>.

export const authSubmitBtn = {
  whileHover: { y: -1, transition: { duration: 0.15 } },
  whileTap:   { scale: 0.985 },
} as const