import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Crown, X, Copy, Gift } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useLanguage } from '@/lib/LanguageContext'
import { Button } from '@/components/ui/button'

/**
 * Promotes the free referral-premium program (invite 1 friend, first 1000
 * only — see migration 0023). Independent of FEATURES.premium, which only
 * gates the old paid CashPlus flow; this mechanic needs no payment backend.
 */
export default function PremiumUpsellBanner() {
  const { t } = useLanguage()
  const me = useAuthStore((s) => s.profile)
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const { data: referralCount } = useQuery({
    queryKey: ['my-referral-count'],
    queryFn: api.getMyReferralCount,
    enabled: open && !!me?.id,
  })
  const { data: premiumClaimed } = useQuery({
    queryKey: ['referral-premium-claimed'],
    queryFn: api.getReferralPremiumClaimed,
    enabled: open,
  })
  const spotsLeft = premiumClaimed != null ? Math.max(0, 1000 - premiumClaimed) : null

  const referralLink = me?.id ? `${window.location.origin}/?ref=${me.id}` : ''
  const copyLink = () => {
    navigator.clipboard.writeText(referralLink)
    toast.success(t('landing.invite_card_copied'))
  }

  if (me?.is_premium || dismissed) return null

  const PERKS = ['perk1', 'perk2', 'perk3', 'perk4', 'perk5'] as const

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gold-500 via-amber-400 to-gold-500 p-4 shadow-md"
      >
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-3 top-3 text-amber-800 hover:text-amber-900"
          aria-label="Dismiss"
        >
          <X size={15} />
        </button>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-700 text-white shadow">
            <Crown size={20} />
          </div>
          <div className="flex-1 min-w-0 pr-6">
            <p className="font-black text-amber-900 text-sm">{t('landing.premium_reward_title')}</p>
            <p className="mt-1 text-[11px] text-amber-800 leading-relaxed">
              {t('shared.premium_upsell.banner_desc')}
            </p>
            <button
              onClick={() => setOpen(true)}
              className="mt-2 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-800 transition-colors"
            >
              {t('shared.premium_upsell.banner_cta')}
            </button>
          </div>
        </div>
      </motion.div>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            >
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 24, scale: 0.97 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-[#16201E] max-h-[85vh] overflow-y-auto"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gold-500 text-white">
                      <Crown size={18} />
                    </div>
                    <h2 className="text-lg font-black text-sand-900 dark:text-white">
                      {t('upgrade.page_title')}
                    </h2>
                  </div>
                  <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="btn-ghost -mr-2 -mt-1">
                    <X size={18} />
                  </button>
                </div>

                <ul className="mt-4 space-y-2">
                  {PERKS.map((k) => (
                    <li key={k} className="text-sm text-sand-700 dark:text-sand-300">
                      {t(`upgrade.${k}`)}
                    </li>
                  ))}
                </ul>

                <div className="mt-4 rounded-xl border border-gold-200 dark:border-gold-900/30 bg-gold-50 dark:bg-gold-900/10 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-black text-gold-700 dark:text-gold-400">
                    <Gift size={13} /> {t('landing.premium_reward_title')}
                  </p>
                  <p className="mt-1 text-[11px] text-sand-600 dark:text-sand-400 leading-relaxed">
                    {t('landing.premium_reward_desc')}
                  </p>
                  <p className="mt-2 text-[11px] font-bold text-gold-700 dark:text-gold-400">
                    {spotsLeft != null
                      ? t('landing.premium_spots_left', { count: spotsLeft })
                      : '…'}
                  </p>

                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-white dark:bg-black/20 border border-gold-200 dark:border-gold-900/30 px-3 py-2">
                    <p className="flex-1 text-xs font-mono text-sand-700 dark:text-sand-300 truncate">{referralLink}</p>
                    <button onClick={copyLink} className="text-gold-600 hover:text-gold-700 transition-colors flex-shrink-0" aria-label={t('landing.invite_card_copy')}>
                      <Copy size={14} />
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] font-semibold text-sand-500">
                    {t('landing.invite_card_count', { count: referralCount ?? 0 })}
                  </p>
                </div>

                <Button className="mt-4 w-full" onClick={copyLink}>
                  {t('landing.invite_card_copy')}
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}
