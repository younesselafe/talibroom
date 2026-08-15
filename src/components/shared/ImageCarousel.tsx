import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── ImageCarousel ──────────────────────────────────────────────────────────
//
// Adapted from 21st.dev "PlaceCard (card-22)". A self-contained, framer-motion
// image carousel that gracefully degrades to a single static image. The parent
// MUST set a height via `className` (e.g. "h-56") — the images are absolutely
// positioned. `overlay` renders above the image (badges etc.); arrows and dots
// only appear when there is more than one image.

interface ImageCarouselProps {
  /** Image URLs. Falsy entries are filtered out; an empty list shows a fallback. */
  images: (string | null | undefined)[]
  /** Accessible description of the subject (e.g. a person's or listing's name). */
  alt: string
  /** Height + any extra styling for the carousel frame. Height is required. */
  className?: string
  /** Extra classes for each <img> — defaults to `object-cover object-top`. */
  imageClassName?: string
  /** Non-interactive content layered over the image (badges, gradients…). */
  overlay?: React.ReactNode
  /** Called when the image itself is clicked (e.g. to open a Lightbox). */
  onImageClick?: (index: number) => void
}

const slide = {
  enter:  (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (dir: number) => ({ x: dir < 0 ? '100%' : '-100%', opacity: 0 }),
}

export default function ImageCarousel({
  images, alt, className, imageClassName, overlay, onImageClick,
}: ImageCarouselProps) {
  const reduceMotion = useReducedMotion()
  const pics = images.filter((src): src is string => Boolean(src))
  const [[index, direction], setSlide] = useState<[number, number]>([0, 0])

  const count = pics.length
  const multi = count > 1
  const current = count ? ((index % count) + count) % count : 0

  const goTo = (next: number) => {
    if (!count) return
    setSlide([next, next > current ? 1 : -1])
  }

  // No images → branded placeholder.
  if (count === 0) {
    return (
      <div
        className={cn(
          'relative grid place-items-center overflow-hidden',
          'bg-gradient-to-br from-primary-100 to-primary-200 dark:from-[#222D2B] dark:to-[#16201E]',
          className,
        )}
      >
        <ImageOff size={26} className="text-primary-300 dark:text-primary-400" aria-hidden />
        <span className="sr-only">No image available for {alt}</span>
        {overlay}
      </div>
    )
  }

  return (
    <div
      className={cn('group/carousel relative overflow-hidden', className)}
      role={multi ? 'group' : undefined}
      aria-roledescription={multi ? 'carousel' : undefined}
      aria-label={multi ? `${alt} — photo gallery` : undefined}
    >
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.img
          key={current}
          src={pics[current]}
          alt={multi ? `${alt} — photo ${current + 1} of ${count}` : alt}
          custom={direction}
          variants={reduceMotion ? undefined : slide}
          initial={reduceMotion ? false : 'enter'}
          animate={reduceMotion ? undefined : 'center'}
          exit={reduceMotion ? undefined : 'exit'}
          transition={{
            x: { type: 'spring', stiffness: 320, damping: 32 },
            opacity: { duration: 0.2 },
          }}
          loading="lazy"
          decoding="async"
          draggable={false}
          onClick={onImageClick ? () => onImageClick(current) : undefined}
          className={cn(
            'absolute inset-0 h-full w-full object-cover object-top',
            onImageClick ? 'cursor-zoom-in' : undefined,
            imageClassName,
          )}
        />
      </AnimatePresence>

      {overlay}

      {multi && (
        <>
          {/* Prev / Next — real buttons, keyboard reachable. */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); goTo(current - 1) }}
            aria-label="Previous photo"
            className={cn(
              'absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center',
              'rounded-full bg-black/35 text-white backdrop-blur-sm transition',
              'hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80',
              'opacity-0 group-hover/carousel:opacity-100 focus-visible:opacity-100',
              'motion-reduce:opacity-100',
            )}
          >
            <ChevronLeft size={18} aria-hidden />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); goTo(current + 1) }}
            aria-label="Next photo"
            className={cn(
              'absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center',
              'rounded-full bg-black/35 text-white backdrop-blur-sm transition',
              'hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80',
              'opacity-0 group-hover/carousel:opacity-100 focus-visible:opacity-100',
              'motion-reduce:opacity-100',
            )}
          >
            <ChevronRight size={18} aria-hidden />
          </button>

          {/* Pagination dots. */}
          <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-1.5">
            {pics.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to photo ${i + 1}`}
                aria-current={i === current}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80',
                  i === current ? 'w-5 bg-white' : 'w-1.5 bg-white/55 hover:bg-white/80',
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
