import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Crown, MapPin, BedDouble, Phone, ChevronLeft, ChevronRight,
  CalendarDays, Wallet, StickyNote, Plus, X, Loader2, Play,
} from 'lucide-react'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { MOROCCAN_CITIES } from '@/types'
import type { ConciergeRequest, ConciergeOfferItem } from '@/types'
import { Button } from '@/components/ui/button'
import Lightbox from '@/components/shared/Lightbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatPrice } from '@/lib/utils'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/LanguageContext'

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<ConciergeRequest['status'], string> = {
  pending:   'bg-gold-100  text-gold-700  border-gold-200  dark:bg-gold-900/20  dark:text-gold-300  dark:border-gold-700/40',
  fulfilled: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700/40',
  cancelled: 'bg-sand-100  text-sand-500  border-sand-200  dark:bg-[#1C1C1A]   dark:text-sand-500  dark:border-[#2A2A26]',
}

// ─── Offer item carousel ──────────────────────────────────────────────────────

function OfferItemCarousel({ item }: { item: ConciergeOfferItem }) {
  const { t } = useLanguage()
  const media = [
    ...item.image_urls,
    ...(item.video_url ? [item.video_url] : []),
  ]
  const [idx, setIdx] = useState(0)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

  const isVideo = (src: string) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(src)
    || item.video_url === src

  const prev = () => setIdx((i) => (i - 1 + media.length) % media.length)
  const next = () => setIdx((i) => (i + 1) % media.length)

  const handleImageClick = () => {
    const imageIdx = item.image_urls.indexOf(media[idx])
    if (imageIdx !== -1) setLightboxIdx(imageIdx)
  }

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg bg-black">
      {/* Media */}
      <div className="relative h-52 bg-black">
        {media.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-sand-600">
            <BedDouble size={32} />
          </div>
        ) : isVideo(media[idx]) ? (
          <video
            key={media[idx]}
            src={media[idx]}
            controls
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <button
            type="button"
            onClick={handleImageClick}
            className="w-full h-full block focus:outline-none"
            aria-label="View fullscreen"
          >
            <img
              key={media[idx]}
              src={media[idx]}
              alt={`Photo ${idx + 1}`}
              className="w-full h-full object-cover hover:brightness-90 transition-[filter] duration-200 cursor-zoom-in"
            />
            <span className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white/80 font-medium">
              🔍 {t('concierge.tap_zoom')}
            </span>
          </button>
        )}
        {media.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition"
            >
              <ChevronRight size={16} />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {media.map((_m, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? 'bg-white w-4' : 'bg-white/40'}`}
                />
              ))}
            </div>
          </>
        )}
        {item.video_url && media[idx] !== item.video_url && (
          <button
            onClick={() => setIdx(media.length - 1)}
            className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 rounded-full px-2 py-1 text-[10px] text-white font-semibold"
          >
            <Play size={10} /> Video
          </button>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && item.image_urls.length > 0 && (
        <Lightbox
          images={item.image_urls}
          index={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onNav={(i) => setLightboxIdx(i)}
        />
      )}

      {/* Details */}
      <div className="bg-white dark:bg-[#1C1C1A] p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          {item.title && (
            <p className="text-sm font-bold text-sand-900 dark:text-white truncate">{item.title}</p>
          )}
          {item.price != null && (
            <p className="text-xl font-black text-sand-900 dark:text-white">
              {formatPrice(item.price)}
              <span className="text-xs font-normal text-sand-400"> / mo</span>
            </p>
          )}
          {item.rooms && (
            <span className="flex items-center gap-1 text-xs font-semibold text-sand-500 bg-sand-100 dark:bg-[#222D2B] rounded-full px-2 py-1">
              <BedDouble size={12} /> {item.rooms} {item.rooms === 1 ? t('concierge.room_singular') : t('concierge.rooms_plural')}
            </span>
          )}
        </div>

        {item.address && (
          <p className="flex items-center gap-1.5 text-sm text-sand-600 dark:text-sand-300">
            <MapPin size={13} className="text-primary-400 flex-shrink-0" />
            {item.city} — {item.address}
          </p>
        )}

        {!item.address && (
          <p className="flex items-center gap-1.5 text-sm text-sand-600 dark:text-sand-300">
            <MapPin size={13} className="text-primary-400" /> {item.city}
          </p>
        )}

        {item.realtor_name && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-sand-500">{item.realtor_name}</p>
            {item.realtor_phone && (
              <a
                href={`tel:${item.realtor_phone}`}
                className="flex items-center gap-1.5 text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline"
              >
                <Phone size={12} /> {item.realtor_phone}
              </a>
            )}
          </div>
        )}

        {item.notes && (
          <p className="text-xs text-sand-500 dark:text-sand-400 pt-1 border-t border-sand-100 dark:border-[#2A2A26]">
            {item.notes}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Request card ─────────────────────────────────────────────────────────────

function RequestCard({ req }: { req: ConciergeRequest }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(req.status === 'fulfilled')
  const offers = req.offers ?? []

  const STATUS_LABEL: Record<ConciergeRequest['status'], string> = {
    pending:   t('concierge.status_pending'),
    fulfilled: t('concierge.status_fulfilled'),
    cancelled: t('concierge.status_cancelled'),
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-sand-100 dark:border-[#2A2A26] overflow-hidden shadow-sm"
    >
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 bg-white dark:bg-[#16201E] text-left hover:bg-sand-50 dark:hover:bg-[#1A2420] transition-colors"
      >
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sand-900 dark:text-white flex items-center gap-1.5">
              <MapPin size={14} className="text-primary-400" /> {req.city}
            </span>
            {req.rooms && (
              <span className="text-xs text-sand-500">· {req.rooms} {req.rooms !== 1 ? t('concierge.rooms_plural') : t('concierge.room_singular')}</span>
            )}
          </div>
          {(req.budget_min != null || req.budget_max != null) && (
            <p className="text-xs text-sand-400">
              Budget: {req.budget_min != null ? formatPrice(req.budget_min) : '?'}
              {' – '}
              {req.budget_max != null ? formatPrice(req.budget_max) : '?'}
            </p>
          )}
          <p className="text-[11px] text-sand-400">
            {new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLE[req.status]}`}>
          {STATUS_LABEL[req.status]}
        </span>
      </button>

      {/* Offer items */}
      <AnimatePresence>
        {open && offers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-sand-50 dark:bg-[#13191A] px-4 py-4 space-y-4"
          >
            <p className="text-xs font-bold text-gold-600 dark:text-gold-400 uppercase tracking-widest">
              {t('concierge.ws_title')}
            </p>
            {offers.map((offer) => (
              <div key={offer.id}>
                <p className="text-xs font-bold text-sand-500 dark:text-sand-400 uppercase tracking-wide mb-3">
                  {offer.title}
                  {offer.description && <span className="ml-2 normal-case font-normal">{offer.description}</span>}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(offer.items ?? []).map((item) => (
                    <OfferItemCarousel key={item.id} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}
        {open && offers.length === 0 && req.status === 'pending' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 py-6 text-center bg-sand-50 dark:bg-[#13191A]">
              <Crown size={24} className="mx-auto text-gold-400 mb-2" />
              <p className="text-sm font-semibold text-sand-700 dark:text-sand-300">
                {t('concierge.pending_note')}
              </p>
              <p className="text-xs text-sand-400 mt-1">
                {t('concierge.pending_desc')}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConciergePage() {
  const { t } = useLanguage()
  const me = useAuthStore((s) => s.profile)
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    city: me?.city ?? '',
    budgetMin: '',
    budgetMax: '',
    rooms: '',
    moveIn: '',
    notes: '',
  })

  const { data: requests, isLoading } = useQuery({
    queryKey: ['concierge-requests'],
    queryFn: api.getMyConciergeRequests,
    enabled: !!me?.is_premium,
  })

  // Realtime: refresh when any offer for user's requests is inserted
  useEffect(() => {
    if (!me?.id) return
    const channel = supabase
      .channel(`concierge-offers:${me.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'concierge_offers' }, () => {
        qc.invalidateQueries({ queryKey: ['concierge-requests'] })
        toast.success(t('concierge.fulfilled_toast'))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [me?.id, qc])

  const create = useMutation({
    mutationFn: () => api.createConciergeRequest({
      city: form.city,
      budget_min: form.budgetMin ? Number(form.budgetMin) : null,
      budget_max: form.budgetMax ? Number(form.budgetMax) : null,
      rooms: form.rooms ? Number(form.rooms) : null,
      move_in_date: form.moveIn || null,
      notes: form.notes.trim() || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['concierge-requests'] })
      setCreating(false)
      setForm({ city: me?.city ?? '', budgetMin: '', budgetMax: '', rooms: '', moveIn: '', notes: '' })
      toast.success(t('concierge.launched_toast'))
    },
    onError: (e: Error) => toast.error(e.message || t('concierge.request_error')),
  })

  const submit = () => {
    if (!form.city) { toast.error(t('concierge.city_required')); return }
    create.mutate()
  }

  // Premium gate
  if (!me?.is_premium) {
    return (
      <div className="page-container max-w-lg flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gold-100 dark:bg-gold-900/30 flex items-center justify-center">
          <Crown size={32} className="text-gold-500" />
        </div>
        <h1 className="text-2xl font-black text-sand-900 dark:text-white">{t('concierge.locked_title')}</h1>
        <p className="text-sand-500 dark:text-sand-400 text-sm max-w-sm">
          {t('concierge.locked_desc')}
        </p>
        <Button
          className="gap-2 bg-gold-500 hover:bg-gold-600 text-white"
          onClick={() => navigate('/upgrade')}
        >
          <Crown size={16} /> {t('unlockPremium')}
        </Button>
      </div>
    )
  }

  return (
    <div className="page-container max-w-3xl">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-2 text-gold-500 mb-2">
          <Crown size={18} />
          <span className="text-xs font-bold uppercase tracking-widest">Main Character Mode 👑</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-sand-900 dark:text-white tracking-tight">
          {t('concierge.page_title')}
        </h1>
        <p className="text-sand-500 dark:text-sand-400 mt-1 text-sm">
          {t('concierge.page_subtitle')}
        </p>
      </motion.div>

      {/* New request button */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                  className="mb-5 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-sand-700 dark:text-sand-300">
          {(requests ?? []).length} {t('concierge.active')} {(requests ?? []).length === 1 ? t('concierge.mission_singular') : t('concierge.mission_plural')}
        </p>
        <Button onClick={() => setCreating((v) => !v)} variant={creating ? 'outline' : 'default'}>
          {creating ? <X size={16} /> : <Plus size={16} />}
          {creating ? t('cancel') : t('concierge.new_mission')}
        </Button>
      </motion.div>

      {/* Create form */}
      <AnimatePresence>
        {creating && (
          <motion.div
            key="form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="rounded-2xl border border-gold-200 dark:border-gold-700/40 bg-gradient-to-br from-gold-50 to-white dark:from-[#1A1A12] dark:to-[#16201E] p-5 space-y-4">
              <p className="text-xs font-bold text-gold-600 dark:text-gold-400 uppercase tracking-widest">
                {t('concierge.form_title')}
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><MapPin size={13} /> {t('city')}</Label>
                  <Select value={form.city} onValueChange={(v) => setForm((f) => ({ ...f, city: v }))}>
                    <SelectTrigger><SelectValue placeholder={t('concierge.select_city')} /></SelectTrigger>
                    <SelectContent>
                      {MOROCCAN_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><BedDouble size={13} /> {t('concierge.rooms_plural')}</Label>
                  <Input
                    type="number" min={1} max={10}
                    value={form.rooms}
                    onChange={(e) => setForm((f) => ({ ...f, rooms: e.target.value }))}
                    placeholder={t('concierge.rooms_placeholder')}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Wallet size={13} /> {t('concierge.budget_min')}</Label>
                  <Input
                    type="number"
                    value={form.budgetMin}
                    onChange={(e) => setForm((f) => ({ ...f, budgetMin: e.target.value }))}
                    placeholder={t('concierge.budget_min_placeholder')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Wallet size={13} /> {t('concierge.budget_max')}</Label>
                  <Input
                    type="number"
                    value={form.budgetMax}
                    onChange={(e) => setForm((f) => ({ ...f, budgetMax: e.target.value }))}
                    placeholder={t('concierge.budget_max_placeholder')}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><CalendarDays size={13} /> {t('concierge.move_in')}</Label>
                <Input
                  type="date"
                  value={form.moveIn}
                  onChange={(e) => setForm((f) => ({ ...f, moveIn: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><StickyNote size={13} /> {t('concierge.notes_label')}</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder={t('concierge.notes_placeholder')}
                  rows={3}
                />
              </div>

              <Button onClick={submit} disabled={create.isPending} className="w-full bg-gold-500 hover:bg-gold-600 text-white">
                {create.isPending
                  ? <Loader2 size={16} className="animate-spin" />
                  : '🚀'}
                {t('concierge.start_mission')}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Request list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-sand-100 dark:bg-[#1C1C1A] animate-pulse" />
          ))}
        </div>
      ) : (requests ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <Crown size={40} className="text-gold-300" />
          <p className="font-bold text-sand-700 dark:text-sand-300">{t('concierge.empty_title')}</p>
          <p className="text-sm text-sand-400">{t('concierge.empty_desc')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(requests ?? []).map((req) => (
            <RequestCard key={req.id} req={req} />
          ))}
        </div>
      )}
    </div>
  )
}
