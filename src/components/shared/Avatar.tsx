import { lazy, Suspense } from 'react'
import { cn, getInitials } from '@/lib/utils'
import type { GenderEnum, LifestyleVec } from '@/types'

// DiceBear's data tables are sizable (~120 kB gzipped) — load them only if
// a character avatar is actually needed, not on every page that shows any
// avatar at all.
const CharacterAvatar = lazy(() => import('./CharacterAvatar'))

interface AvatarProps {
  src?: string | null
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  isPremium?: boolean
  isOnline?: boolean
  className?: string
  /** When src is missing and gender is known, shows a character illustration
   *  instead of initials — see CharacterAvatar. */
  gender?: GenderEnum | null
  lifestyle?: LifestyleVec | null
  /** Stable identity for the generated character (ideally the profile id) —
   *  falls back to `name` so callers aren't required to pass it. */
  seed?: string
}

const sizes = {
  xs:  'w-6 h-6 text-[10px]',
  sm:  'w-8 h-8 text-xs',
  md:  'w-10 h-10 text-sm',
  lg:  'w-14 h-14 text-base',
  xl:  'w-20 h-20 text-xl',
}

export default function Avatar({
  src, name, size = 'md', isPremium, isOnline, className, gender, lifestyle, seed,
}: AvatarProps) {
  return (
    <div className={cn('relative flex-shrink-0', className)}>
      <div className={cn(
        'rounded-full overflow-hidden bg-gradient-to-br from-primary-200 to-primary-400 flex items-center justify-center font-semibold text-white',
        sizes[size],
        isPremium && 'ring-2 ring-gold-500 ring-offset-1 ring-offset-[--bg]',
      )}>
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : gender ? (
          <Suspense fallback={<span>{getInitials(name)}</span>}>
            <CharacterAvatar seed={seed ?? name} gender={gender} lifestyle={lifestyle} className="w-full h-full" />
          </Suspense>
        ) : (
          <span>{getInitials(name)}</span>
        )}
      </div>
      {isOnline && (
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-mint-500 rounded-full border-2 border-[--bg]" />
      )}
      {isPremium && (
        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-gold-500 rounded-full flex items-center justify-center text-[8px]">
          ★
        </span>
      )}
    </div>
  )
}
