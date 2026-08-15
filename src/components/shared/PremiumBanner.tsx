import { Crown, X } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useLanguage } from '@/lib/LanguageContext'
import { FEATURES } from '@/lib/featureFlags'

export default function PremiumBanner() {
  const { t } = useLanguage()
  const me = useAuthStore((s) => s.profile)
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(false)

  if (!FEATURES.premium || me?.is_premium || dismissed) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="relative mx-4 mb-4 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 p-4 shadow-md"
      >
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-3 top-3 text-amber-700 hover:text-amber-900"
        >
          <X size={15} />
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white shadow">
            <Crown size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-amber-900 text-sm">{t('shared.premium_banner.title')}</p>
            <ul className="mt-1 space-y-0.5 text-[11px] text-amber-800">
              <li>{t('shared.premium_banner.perk1')}</li>
              <li>{t('shared.premium_banner.perk2')}</li>
              <li>{t('shared.premium_banner.perk3')}</li>
              <li>{t('shared.premium_banner.perk4')}</li>
              <li>{t('shared.premium_banner.perk5')}</li>
            </ul>
            <button
              onClick={() => navigate('/upgrade')}
              className="mt-2 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-800 transition-colors"
            >
              {t('shared.premium_banner.cta')}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
