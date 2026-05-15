import { motion } from 'framer-motion'
import { Card } from './card'
import { Button } from './button'
import { Badge } from './badge'

// Framer-Motion-wrapped shadcn primitives.
// Use these when you want layout/gesture animation on a shadcn component directly.
export const MotionCard   = motion.create(Card)
export const MotionButton = motion.create(Button)
export const MotionBadge  = motion.create(Badge)

// Shared animation presets — import to keep motion consistent across the app.
export const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -10 },
}

export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}

export const staggerItem = {
  initial: { opacity: 0, y: 24, scale: 0.97 },
  animate: {
    opacity: 1, y: 0, scale: 1,
    transition: { ease: [0.16, 1, 0.3, 1], duration: 0.5 },
  },
}

export const cardHover = {
  whileHover: { y: -4, transition: { duration: 0.2 } },
  whileTap:   { scale: 0.985 },
}

export const springTransition = { type: 'spring' as const, stiffness: 400, damping: 30 }
