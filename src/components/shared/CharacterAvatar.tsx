import { useMemo } from 'react'
import { createAvatar } from '@dicebear/core'
import * as notionists from '@dicebear/notionists'
import type { Options } from '@dicebear/notionists'
import type { GenderEnum, LifestyleVec } from '@/types'
import { cn } from '@/lib/utils'

// Notionists has no color options at all for hair/skin/clothes — it's a
// black-and-white line-art style by design, which is exactly why it was
// picked (matches the illustrations already used on the login page).

// Curated from all 63 hair variants — split by which ones read as short
// vs. long, including a couple of headscarf styles for #62/#63.
const MALE_HAIR: Options['hair'] = [
  'variant01', 'variant03', 'variant04', 'variant05', 'variant06', 'variant07',
  'variant09', 'variant11', 'variant12', 'variant13', 'variant15', 'variant16',
  'variant17', 'variant18', 'variant19', 'variant20', 'variant21', 'variant22',
  'variant24', 'variant25', 'variant26', 'variant27', 'variant29', 'variant30',
  'variant31', 'variant32', 'variant33', 'variant34', 'variant35', 'variant40',
  'variant44', 'variant49', 'variant50', 'variant51', 'variant52', 'variant53',
  'variant54', 'variant55', 'variant56', 'variant60',
]
const FEMALE_HAIR: Options['hair'] = [
  'variant02', 'variant08', 'variant10', 'variant23', 'variant28', 'variant36',
  'variant37', 'variant38', 'variant39', 'variant41', 'variant43', 'variant45',
  'variant46', 'variant47', 'variant48', 'variant57', 'variant58', 'variant59',
  'variant62', 'variant63',
]

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

function vibeOptions(vibe: Vibe): Partial<Options> {
  switch (vibe) {
    case 'focused': return { glassesProbability: 100 }
    case 'bright':  return { gesture: ['wavePointLongArms', 'waveLongArms', 'waveOkLongArms'], gestureProbability: 100 }
    case 'dreamy':  return { bodyIcon: ['galaxy', 'saturn'], bodyIconProbability: 100 }
    case 'chill':   return { gesture: ['ok', 'hand'], gestureProbability: 100, bodyIcon: ['electric'], bodyIconProbability: 60 }
    case 'neutral': return {}
  }
}

interface CharacterAvatarProps {
  /** Stable per-person identity (profile id, or full name as a fallback) —
   *  keeps the same person's avatar consistent across renders/sessions. */
  seed: string
  gender?: GenderEnum | null
  lifestyle?: LifestyleVec | null
  className?: string
}

export default function CharacterAvatar({ seed, gender, lifestyle, className }: CharacterAvatarProps) {
  const vibe = vibeFromLifestyle(lifestyle)
  const isFemale = gender === 'female'

  const dataUri = useMemo(() => {
    return createAvatar(notionists, {
      seed,
      hair: isFemale ? FEMALE_HAIR : MALE_HAIR,
      beardProbability: isFemale ? 0 : 35,
      backgroundColor: ['f4f3ef'],
      ...vibeOptions(vibe),
    }).toDataUri()
  }, [seed, isFemale, vibe])

  return <img src={dataUri} alt="" className={cn('object-cover', className)} />
}
