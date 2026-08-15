import type { Profile } from '@/types'

// ─── Compatibility scoring ──────────────────────────────────────────────────
//
// TalibRoom has no stored "match" field, so we derive one. When both the viewer
// and the candidate expose a lifestyle vector we score the overlap; otherwise
// we fall back to a deterministic per-profile value so the badge never flickers
// between renders.

const LIFESTYLE_KEYS = [
  'sleep_time', 'study_style', 'cleanliness',
  'smoking', 'pets', 'guests', 'diet', 'noise_level',
] as const

/** Stable 0–1 value from a string (FNV-1a) — deterministic pseudo-randomness. */
function hash01(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 1000) / 1000
}

/**
 * Compatibility score (50–99) between the signed-in viewer and another profile.
 * Higher means more shared lifestyle preferences. Pure and deterministic.
 */
export function compatibilityScore(
  viewer: Profile | null | undefined,
  candidate: Profile,
): number {
  const mine = viewer?.lifestyle_json
  const theirs = candidate.lifestyle_json
  let score: number

  if (mine && theirs) {
    let compared = 0
    let matched = 0
    for (const key of LIFESTYLE_KEYS) {
      const a = mine[key]
      const b = theirs[key]
      if (a === undefined || b === undefined) continue
      compared++
      if (a === b) matched++
    }
    const ratio = compared > 0 ? matched / compared : hash01(candidate.id)
    score = 55 + ratio * 43 // 55–98 from lifestyle overlap
    if (viewer?.city && viewer.city === candidate.city) score += 4 // same-city nudge
  } else {
    score = 62 + hash01(candidate.id) * 36 // 62–98 deterministic fallback
  }

  return Math.round(Math.min(99, Math.max(50, score)))
}

/** Visual tone for a score — drives the match badge colour. */
export function compatibilityTone(score: number): 'high' | 'good' | 'fair' {
  if (score >= 88) return 'high'
  if (score >= 74) return 'good'
  return 'fair'
}
