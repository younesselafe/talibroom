import { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface LightboxProps {
  images: string[]
  index: number
  onClose: () => void
  onNav?: (next: number) => void
}

export default function Lightbox({ images, index, onClose, onNav }: LightboxProps) {
  const multi = images.length > 1

  const goTo = useCallback((next: number) => {
    const clamped = ((next % images.length) + images.length) % images.length
    onNav?.(clamped)
  }, [images.length, onNav])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && multi) goTo(index + 1)
      if (e.key === 'ArrowLeft' && multi) goTo(index - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, goTo, index, multi])

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="lightbox"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90"
        onClick={onClose}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur-sm hover:bg-white/25 transition"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Image */}
        <motion.img
          key={index}
          src={images[index]}
          alt={`Photo ${index + 1} of ${images.length}`}
          initial={{ scale: 0.93, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
        />

        {/* Prev / Next */}
        {multi && (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); goTo(index - 1) }}
              aria-label="Previous photo"
              className="absolute left-4 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur-sm hover:bg-white/25 transition"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); goTo(index + 1) }}
              aria-label="Next photo"
              className="absolute right-4 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur-sm hover:bg-white/25 transition"
            >
              <ChevronRight size={22} />
            </button>

            {/* Dots */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); goTo(i) }}
                  aria-label={`Go to photo ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/45 hover:bg-white/70'}`}
                />
              ))}
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}
