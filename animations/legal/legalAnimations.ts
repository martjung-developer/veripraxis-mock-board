// src/animations/legal/legalAnimations.ts
// Shared animations for Privacy, Terms of Service, and Cookie Policy pages.
// Imports from: @/animations/variants/fade  &  @/animations/presets/publicPage

import { fadeUp, slideLeft, staggerContainer } from '@/animations/variants/fade'

// ── Hero ──────────────────────────────────────────────────────────────────────
export const legalHero = {
  initial:    'hidden',
  animate:    'show',
  variants:   fadeUp,
  transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
} as const

// ── TOC sidebar ───────────────────────────────────────────────────────────────
export const toc = {
  initial:    'hidden',
  animate:    'show',
  variants:   slideLeft,
  transition: { delay: 0.2 },
} as const

// ── Content body — stagger sections ──────────────────────────────────────────
export const contentBody = {
  initial:  'hidden',
  animate:  'show',
  variants: { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } } },
} as const

export const contentSection = {
  variants: fadeUp,
} as const

// ── Related links ─────────────────────────────────────────────────────────────
export const relatedContainer = {
  initial:     'hidden',
  whileInView: 'show',
  viewport:    { once: true, amount: 0.4 },
  variants:    staggerContainer,
} as const

export const relatedBtn = {
  variants:   fadeUp,
  whileHover: { y: -2, transition: { duration: 0.15 } },
  whileTap:   { scale: 0.97 },
} as const