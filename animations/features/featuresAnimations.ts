// src/animations/features/featuresAnimations.ts
// Page-specific animations for the Features page.
// Imports from: @/animations/variants/fade

import { fadeUp, scaleIn, staggerContainer } from '@/animations/variants/fade'
import type { Variants } from 'framer-motion'

// ── Feature cards grid ────────────────────────────────────────────────────────
export const cardsContainer = {
  initial:     'hidden',
  whileInView: 'show',
  viewport:    { once: true, amount: 0.08 },
  variants:    staggerContainer,
} as const

export const featureCard = {
  variants:   scaleIn,
  whileHover: { y: -4, transition: { duration: 0.2 } },
} as const

// ── Feature split rows (alternating image + text) ────────────────────────────
export const splitText = (fromLeft = true) => ({
  initial:     'hidden',
  whileInView: 'show',
  viewport:    { once: true, amount: 0.12 },
  variants:    {
    hidden: { opacity: 0, x: fromLeft ? -28 : 28 },
    show:   { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] } },
  } satisfies Variants,
} as const)

export const splitVisual = (fromLeft = false) => ({
  initial:     'hidden',
  whileInView: 'show',
  viewport:    { once: true, amount: 0.12 },
  variants:    {
    hidden: { opacity: 0, x: fromLeft ? -28 : 28, scale: 0.97 },
    show:   { opacity: 1, x: 0, scale: 1, transition: { duration: 0.65, delay: 0.12, ease: [0.4, 0, 0.2, 1] } },
  } satisfies Variants,
} as const)

// ── Feature list items (icon + title + desc) ──────────────────────────────────
export const featureListContainer = {
  initial:     'hidden',
  whileInView: 'show',
  viewport:    { once: true, amount: 0.1 },
  variants:    staggerContainer,
} as const

export const featureListItem = {
  variants:   fadeUp,
  whileHover: { x: 4, transition: { duration: 0.18 } },
} as const

// ── CTA section ───────────────────────────────────────────────────────────────
export const ctaSection = {
  initial:     'hidden',
  whileInView: 'show',
  viewport:    { once: true, amount: 0.3 },
  variants:    fadeUp,
} as const