import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Crown, Upload, CheckCircle2, Clock, XCircle, Copy, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/LanguageContext'

const PRICE_MAD = 49
const CIH_ACCOUNT = 'CIH Bank — 230 810 0000123456789012 00'
const CASHPLUS_NUMBER = 'CashPlus — 06 XX XX XX XX'
const IBAN = 'MA64 230 8100001234567890 1200'

export default function UpgradePage() {
  const { t } = useLanguage()
  const me = useAuthStore((s) => s.profile)
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const { data: existingRequest, isLoading: loadingReq } = useQuery({
    queryKey: ['my-premium-request'],
    queryFn: api.getMyPremiumRequest,
  })

  // Realtime: listen for admin approval/rejection
  useEffect(() => {
    if (!me?.id) return
    const channel = supabase
      .channel(`premium-request:${me.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'premium_requests', filter: `user_id=eq.${me.id}` },
        (payload) => {
          qc.invalidateQueries({ queryKey: ['my-premium-request'] })
          if (payload.new?.status === 'approved') {
            toast.success(t('upgrade.approved_toast'))
            qc.invalidateQueries({ queryKey: ['profile'] })
          } else if (payload.new?.status === 'rejected') {
            toast.error(t('upgrade.rejected_toast'))
          }
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [me?.id, qc])

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('No file selected')
      const url = await api.uploadReceipt(file)
      await api.createPremiumRequest(url)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-premium-request'] })
      toast.success(t('upgrade.submitted_toast'))
      setFile(null)
      setPreview(null)
    },
    onError: (e: Error) => toast.error(e.message || 'Upload failed — try again.'),
  })

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  if (me?.is_premium) {
    return (
      <div className="page-container max-w-lg flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gold-100 dark:bg-gold-900/30 flex items-center justify-center">
          <Crown size={32} className="text-gold-500" />
        </div>
        <h1 className="text-2xl font-black text-sand-900 dark:text-white">{t('upgrade.already_title')}</h1>
        <p className="text-sand-500 dark:text-sand-400 text-sm">
          {t('upgrade.already_desc')}
        </p>
      </div>
    )
  }

  const status = existingRequest?.status

  return (
    <div className="page-container max-w-lg">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        {/* Hero */}
        <div className="flex items-center gap-2 text-gold-500 mb-2">
          <Crown size={18} />
          <span className="text-xs font-bold uppercase tracking-widest">Main Character Mode 👑</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-sand-900 dark:text-white tracking-tight mb-1">
          {t('upgrade.unlock_title')}
        </h1>
        <p className="text-sand-500 dark:text-sand-400 text-sm mb-6">
          {t('upgrade.price_desc')}
        </p>

        {/* Perks */}
        <div className="rounded-2xl border border-gold-200 dark:border-gold-700/40 bg-gradient-to-br from-gold-50 to-white dark:from-[#1A1A12] dark:to-[#16201E] p-5 mb-6 space-y-2">
          {([
            t('upgrade.perk1'),
            t('upgrade.perk2'),
            t('upgrade.perk3'),
            t('upgrade.perk4'),
            t('upgrade.perk5'),
          ] as string[]).map((perk) => (
            <div key={perk} className="flex items-center gap-2 text-sm text-sand-700 dark:text-sand-300">
              <CheckCircle2 size={14} className="text-gold-500 flex-shrink-0" />
              {perk}
            </div>
          ))}
        </div>

        {/* Status banner */}
        {loadingReq ? null : status === 'pending' ? (
          <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700/40 p-4 mb-6">
            <Clock size={20} className="text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">{t('upgrade.status_review')}</p>
              <p className="text-xs text-amber-700 dark:text-amber-400">{t('upgrade.status_review_desc')}</p>
            </div>
          </div>
        ) : status === 'rejected' ? (
          <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-700/40 p-4 mb-6">
            <XCircle size={20} className="text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-700 dark:text-red-400">{t('upgrade.status_rejected')}</p>
              <p className="text-xs text-red-600 dark:text-red-400">{t('upgrade.status_rejected_desc')}</p>
            </div>
          </div>
        ) : null}

        {/* Bank details */}
        <div className="rounded-2xl border border-sand-200 dark:border-[#2A2A26] bg-white dark:bg-[#1C1C1A] p-5 mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-sand-400 mb-3">{t('upgrade.payment_title')}</p>
          <p className="text-sm font-semibold text-sand-700 dark:text-sand-300 mb-3">
            {t('upgrade.send_exactly')} <span className="text-gold-600 font-black">{PRICE_MAD} {t('upgrade.mad')}</span> {t('upgrade.to_one_of')}
          </p>
          {[
            { label: t('upgrade.cih_label'), value: CIH_ACCOUNT },
            { label: t('upgrade.cashplus_label'), value: CASHPLUS_NUMBER },
            { label: t('upgrade.iban_label'), value: IBAN },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between gap-2 py-2 border-b border-sand-100 dark:border-[#2A2A26] last:border-0">
              <div>
                <p className="text-xs text-sand-400">{label}</p>
                <p className="text-sm font-mono font-semibold text-sand-900 dark:text-white">{value}</p>
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(value); toast.success(t('copied')) }}
                className="text-sand-400 hover:text-sand-600 transition-colors"
                aria-label={`Copy ${label}`}
              >
                <Copy size={14} />
              </button>
            </div>
          ))}
          <p className="text-[11px] text-sand-400 mt-3">
            {t('upgrade.receipt_hint')}
          </p>
        </div>

        {/* Upload form */}
        {status !== 'pending' && (
          <div className="rounded-2xl border border-sand-200 dark:border-[#2A2A26] bg-white dark:bg-[#1C1C1A] p-5 space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-sand-400">{t('upgrade.upload_label')}</p>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileChange}
            />

            {preview ? (
              <div className="relative rounded-xl overflow-hidden">
                <img src={preview} alt="Receipt preview" className="w-full max-h-64 object-contain bg-sand-50 dark:bg-[#13191A]" />
                <button
                  onClick={() => { setFile(null); setPreview(null) }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white text-xs hover:bg-black/70 transition"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-sand-200 dark:border-[#2A2A26] py-10 flex flex-col items-center gap-2 text-sand-400 hover:border-gold-400 hover:text-gold-500 transition-colors"
              >
                <Upload size={24} />
                <span className="text-sm font-semibold">{t('upgrade.upload_tap')}</span>
                <span className="text-xs">{t('upgrade.upload_hint')}</span>
              </button>
            )}

            <Button
              onClick={() => upload.mutate()}
              disabled={!file || upload.isPending}
              className="w-full bg-gold-500 hover:bg-gold-600 text-white"
            >
              {upload.isPending
                ? <Loader2 size={16} className="animate-spin mr-2" />
                : <Crown size={16} className="mr-2" />}
              {t('upgrade.submit_btn')}
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
