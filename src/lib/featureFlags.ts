/**
 * Central on/off switches for features without a real backend process yet
 * (no payment fulfillment, no real realtor accounts). Flip to true once
 * ready to re-launch them.
 */
export const FEATURES = {
  concierge: false,
  premium: false,
  realtors: false,
} as const
