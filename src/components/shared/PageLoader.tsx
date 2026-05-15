import { motion } from 'framer-motion'

export default function PageLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[--bg] z-50">
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="relative">
          <motion.div
            className="w-12 h-12 rounded-2xl bg-primary-500"
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.05, 0.95, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute inset-0 w-12 h-12 rounded-2xl bg-primary-400"
            animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        <motion.p
          className="text-sm font-semibold text-sand-500 dark:text-sand-400 tracking-wide"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          MoRoom
        </motion.p>
      </motion.div>
    </div>
  )
}
