import type { GenderEnum, LifestyleVec } from '@/types'

type Vibe = 'focused' | 'bright' | 'dreamy' | 'chill' | 'neutral'

/**
 * Derives a "vibe" from the two most visually expressive lifestyle traits.
 * Falls back to 'neutral' when lifestyle data hasn't been filled in yet
 * (e.g. a realtor, or a student mid-onboarding).
 */
function vibeFromLifestyle(lifestyle?: LifestyleVec | null): Vibe {
  if (!lifestyle?.sleep_time || !lifestyle?.study_style) return 'neutral'
  if (lifestyle.sleep_time === 'early' && lifestyle.study_style === 'quiet') return 'focused'
  if (lifestyle.sleep_time === 'early' && lifestyle.study_style === 'social') return 'bright'
  if (lifestyle.sleep_time === 'night_owl' && lifestyle.study_style === 'quiet') return 'dreamy'
  return 'chill'
}

interface CharacterAvatarProps {
  gender?: GenderEnum | null
  lifestyle?: LifestyleVec | null
  className?: string
}

/**
 * Black-and-white placeholder character, shown instead of initials when a
 * profile has no photo. Hairstyle silhouette reflects gender; a small
 * accessory reflects the person's lifestyle vibe. Pure line art — no color,
 * by design, so it never competes with real photos in a feed.
 */
export default function CharacterAvatar({ gender, lifestyle, className }: CharacterAvatarProps) {
  const isFemale = gender === 'female'
  const vibe = vibeFromLifestyle(lifestyle)

  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={isFemale ? 'Female' : 'Male'}>
      <rect width="100" height="100" fill="#F4F3EF" />

      {/* Shoulders */}
      <path d="M20 100 Q20 72 50 70 Q80 72 80 100 Z" fill="#111111" />

      {/* Head */}
      <circle cx="50" cy="46" r="20" fill="#111111" />
      <circle cx="50" cy="45.5" r="18.5" fill="#F4F3EF" />

      {/* Hair — gender silhouette */}
      {isFemale ? (
        <path
          d="M29 42 Q27 22 50 20 Q73 22 71 42 Q71 58 66 66 Q69 48 64 36 Q57 44 50 44 Q43 44 36 36 Q31 48 34 66 Q29 58 29 42 Z"
          fill="#111111"
        />
      ) : (
        <path
          d="M30 40 Q29 24 50 23 Q71 24 70 40 Q70 32 50 30 Q30 32 30 40 Z"
          fill="#111111"
        />
      )}

      {/* Face marks — neutral, abstract */}
      <circle cx="43" cy="47" r="1.6" fill="#111111" />
      <circle cx="57" cy="47" r="1.6" fill="#111111" />
      <path d="M45 55 Q50 58 55 55" stroke="#111111" strokeWidth="1.6" fill="none" strokeLinecap="round" />

      {/* Vibe accessory */}
      {vibe === 'focused' && (
        <g stroke="#111111" strokeWidth="1.8" fill="none">
          <circle cx="43" cy="47" r="6" />
          <circle cx="57" cy="47" r="6" />
          <path d="M49 47 H51" />
        </g>
      )}
      {vibe === 'chill' && (
        <g fill="#111111">
          <path d="M28 44 Q28 26 50 26 Q72 26 72 44" stroke="#111111" strokeWidth="3" fill="none" strokeLinecap="round" />
          <rect x="24" y="42" width="7" height="12" rx="3.5" />
          <rect x="69" y="42" width="7" height="12" rx="3.5" />
        </g>
      )}
      {vibe === 'dreamy' && (
        <g>
          <circle cx="76" cy="20" r="6" fill="#111111" />
          <circle cx="79" cy="18" r="6" fill="#F4F3EF" />
          <circle cx="66" cy="14" r="1.2" fill="#111111" />
          <circle cx="70" cy="28" r="1" fill="#111111" />
        </g>
      )}
      {vibe === 'bright' && (
        <g stroke="#111111" strokeWidth="2" strokeLinecap="round">
          <circle cx="76" cy="18" r="5" fill="#F4F3EF" />
          <path d="M76 8 V10 M76 26 V28 M66 18 H68 M84 18 H86 M69 11 L70.5 12.5 M83 11 L81.5 12.5 M69 25 L70.5 23.5 M83 25 L81.5 23.5" />
        </g>
      )}
    </svg>
  )
}
