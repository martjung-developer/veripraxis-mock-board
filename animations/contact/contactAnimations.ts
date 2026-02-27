// src/animations/contact/contactAnimations.ts
// Page-specific animations for the Contact page.
// Imports from: @/animations/variants/fade

import { fadeUp, staggerContainer } from '@/animations/variants/fade'

// ── Layout split ──────────────────────────────────────────────────────────────
export const channelsCol = {
  initial:     'hidden',
  whileInView: 'show',
  viewport:    { once: true, amount: 0.1 },
  variants:    {
    hidden: { opacity: 0, x: -28 },
    show:   { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] } },
  },
} as const

export const formCol = {
  initial:     'hidden',
  whileInView: 'show',
  viewport:    { once: true, amount: 0.1 },
  variants:    {
    hidden: { opacity: 0, x: 28 },
    show:   { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] } },
  },
} as const

// ── Channel cards ─────────────────────────────────────────────────────────────
export const channelsContainer = {
  initial:     'hidden',
  whileInView: 'show',
  viewport:    { once: true, amount: 0.1 },
  variants:    staggerContainer,
} as const

export const channelCard = {
  variants:   fadeUp,
  whileHover: { x: 4, transition: { duration: 0.18 } },
} as const

// ── Form fields ───────────────────────────────────────────────────────────────
export const formContainer = {
  initial:  'hidden',
  animate:  'show',
  variants: staggerContainer,
} as const

export const formField = {
  variants: fadeUp,
} as const