// src/animations/help/helpAnimations.ts
// Page-specific animations for the Help/FAQ page.
// Imports from: @/animations/variants/fade  &  @/animations/presets/publicPage

import { scaleIn, fadeUp, staggerContainer } from '@/animations/variants/fade'
import { faqAnswer } from '@/animations/presets/publicPage'

export { faqAnswer }

// ── Quick link cards ──────────────────────────────────────────────────────────
export const quickLinksContainer = {
  initial:     'hidden',
  whileInView: 'show',
  viewport:    { once: true, amount: 0.2 },
  variants:    staggerContainer,
} as const

export const quickCard = {
  variants:   scaleIn,
  whileHover: { y: -2, transition: { duration: 0.15 } },
  whileTap:   { scale: 0.97 },
} as const

// ── FAQ groups ────────────────────────────────────────────────────────────────
export const faqGroups = {
  initial:     'hidden',
  whileInView: 'show',
  viewport:    { once: true, amount: 0.05 },
  variants:    staggerContainer,
} as const

export const faqGroup = {
  variants: fadeUp,
} as const