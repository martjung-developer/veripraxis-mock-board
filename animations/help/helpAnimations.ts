// animations/help/help.ts
// Animation variants and timing constants for the Student Help page

export const ANIMATION_DURATION = {
  fast: 200,
  normal: 350,
  slow: 500,
  stagger: 80,
} as const;

export const EASING = {
  smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  easeOut: "cubic-bezier(0, 0, 0.2, 1)",
  easeIn: "cubic-bezier(0.4, 0, 1, 1)",
} as const;

/** Returns inline style for a staggered fade-in-up entry animation */
export function staggerFadeInUp(index: number, baseDelayMs = 0) {
  return {
    animationDelay: `${baseDelayMs + index * ANIMATION_DURATION.stagger}ms`,
  };
}

/** Returns inline style for fade-in with a custom delay */
export function fadeInDelay(delayMs: number) {
  return {
    animationDelay: `${delayMs}ms`,
  };
}

/** CSS keyframe names used across the help page */
export const KEYFRAMES = {
  fadeInUp: "helpFadeInUp",
  fadeIn: "helpFadeIn",
  slideInRight: "helpSlideInRight",
  pulse: "helpPulse",
  shimmer: "helpShimmer",
  scaleIn: "helpScaleIn",
} as const;

/** Stagger delay groups for section-level animations */
export const SECTION_DELAYS = {
  hero: 0,
  searchBar: 120,
  categories: 240,
  faq: 360,
  contact: 480,
  ticket: 560,
} as const;

/** Per-card stagger within a grid */
export function cardStagger(index: number) {
  return SECTION_DELAYS.categories + index * ANIMATION_DURATION.stagger;
}

/** Per-FAQ-item stagger */
export function faqStagger(index: number) {
  return SECTION_DELAYS.faq + index * 60;
}