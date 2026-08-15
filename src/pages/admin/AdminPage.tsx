import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldAlert, Ban, CheckCircle2, Loader2, ShieldCheck,
  Crown, ChevronDown, ChevronUp, Plus, Trash2, ImagePlus, Video, X, Phone, User,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import type { Report, ConciergeRequest } from '@/types'
import Avatar from '@/components/shared/Avatar'
import EmptyState from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatRelativeTime, cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/LanguageContext'

function safeReceiptUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return null
    if (!u.hostname.endsWith('.supabase.co')) return null
    return url
  } catch { return null }
}

interface Group {
  userId: string | null
  reports: Report[]
}

/** A user is actively banned if the flag is set and the window hasn't passed. */
function isBanned(bannedUntil?: string | null, flag?: boolean): boolean {
  if (!flag) return false
  return !bannedUntil || new Date(bannedUntil) > new Date()
}

// ─── Offer item form row ──────────────────────────────────────────────────────

interface OfferItemDraft {
  title: string
  city: string
  address: string
  price: string
  rooms: string
  realtorName: string
  realtorPhone: string
  notes: string
  imageFiles: File[]
  videoFile: File | null
}

function emptyDraft(): OfferItemDraft {
  return {
    title: '', city: '', address: '', price: '', rooms: '',
    realtorName: '', realtorPhone: '', notes: '',
    imageFiles: [], videoFile: null,
  }
}

function OfferItemRow({
  draft, index, onChange, onRemove,
}: {
  draft: OfferItemDraft
  index: number
  onChange: (d: OfferItemDraft) => void
  onRemove: () => void
}) {
  const { t } = useLanguage()
  const photoRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)

  const set = <K extends keyof OfferItemDraft>(k: K, v: OfferItemDraft[K]) =>
    onChange({ ...draft, [k]: v })

  const addPhotos = (files: FileList | null) => {
    if (!files) return
    const next = [...draft.imageFiles, ...Array.from(files)].slice(0, 5)
    set('imageFiles', next)
  }

  const removePhoto = (i: number) =>
    set('imageFiles', draft.imageFiles.filter((_, j) => j !== i))

  const pickVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    e.target.value = ''
    if (!file) return
    try {
      await api.validateVideo(file, 30)
      set('videoFile', file)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Invalid video (max 30s)')
    }
  }

  return (
    <div className="rounded-xl border border-sand-200 dark:border-[#2A2A26] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-sand-400 uppercase tracking-wide">{t('admin.offer_prefix')}{index + 1}</span>
        <button type="button" onClick={onRemove} className="text-red-400 hover:text-red-600">
          <Trash2 size={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input className="input-field col-span-2" placeholder={t('admin.field_title')} value={draft.title}
          onChange={(e) => set('title', e.target.value)} />
        <input className="input-field" placeholder={t('city')} value={draft.city}
          onChange={(e) => set('city', e.target.value)} />
        <input className="input-field" placeholder={t('admin.field_address')} value={draft.address}
          onChange={(e) => set('address', e.target.value)} />
        <input className="input-field" placeholder={t('admin.field_price')} type="number" value={draft.price}
          onChange={(e) => set('price', e.target.value)} />
        <input className="input-field" placeholder={t('concierge.rooms_plural')} type="number" value={draft.rooms}
          onChange={(e) => set('rooms', e.target.value)} />
        <input className="input-field" placeholder={t('admin.field_realtor_name')} value={draft.realtorName}
          onChange={(e) => set('realtorName', e.target.value)} />
        <input className="input-field" placeholder={t('admin.field_realtor_phone')} value={draft.realtorPhone}
          onChange={(e) => set('realtorPhone', e.target.value)} />
        <textarea className="input-field col-span-2 min-h-[60px] resize-none" placeholder={t('admin.field_notes')}
          value={draft.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>

      {/* ── Photos (up to 5) ── */}
      <div>
        <p className="text-[11px] font-semibold text-sand-400 mb-1.5 uppercase tracking-wide">
          {t('admin.field_photos')} ({draft.imageFiles.length}/5)
        </p>
        <div className="flex flex-wrap gap-2">
          {draft.imageFiles.map((f, i) => (
            <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden">
              <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 flex items-center justify-center"
              >
                <X size={9} className="text-white" />
              </button>
            </div>
          ))}
          {draft.imageFiles.length < 5 && (
            <label className="w-16 h-16 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-sand-300 dark:border-[#3A3A36] cursor-pointer hover:border-primary-400 transition-colors">
              <input
                ref={photoRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => addPhotos(e.target.files)}
              />
              <ImagePlus size={14} className="text-sand-400" />
              <span className="text-[9px] text-sand-400 mt-0.5">{t('admin.add')}</span>
            </label>
          )}
        </div>
      </div>

      {/* ── Video (max 30s) ── */}
      <div>
        <p className="text-[11px] font-semibold text-sand-400 mb-1.5 uppercase tracking-wide">
          Video tour <span className="text-gold-500 normal-case font-normal">{t('admin.video_max')}</span>
        </p>
        <input ref={videoRef} type="file" accept="video/*" hidden onChange={pickVideo} />
        {draft.videoFile ? (
          <div className="flex items-center gap-2">
            <video
              src={URL.createObjectURL(draft.videoFile)}
              className="h-16 rounded-lg bg-black"
              controls
            />
            <button
              type="button"
              onClick={() => set('videoFile', null)}
              className="text-xs text-red-400 hover:underline"
            >
              {t('admin.remove')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => videoRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border-2 border-dashed border-gold-300 dark:border-gold-700/50 px-3 py-2 text-xs text-gold-600 dark:text-gold-400 hover:border-gold-400 transition-colors"
          >
            <Video size={13} /> {t('admin.add_video')}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Concierge request card ───────────────────────────────────────────────────

function ConciergeCard({ req }: { req: ConciergeRequest }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [drafts, setDrafts] = useState<OfferItemDraft[]>([emptyDraft()])
  const [offerTitle, setOfferTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const allItems = req.offers?.flatMap((o) => o.items ?? []) ?? []
  const hasOffer = req.offers && req.offers.length > 0

  const handleSubmit = async () => {
    const valid = drafts.filter((d) => d.title.trim())
    if (!valid.length) { toast.error('Add at least one offer item with a title'); return }
    setSubmitting(true)
    try {
      const offer = await api.createConciergeOffer({ request_id: req.id, title: offerTitle.trim() || `Offer for ${req.city}` })
      await Promise.all(valid.map(async (d) => {
        const image_urls = await Promise.all(d.imageFiles.map((f) => api.uploadConciergeImage(f)))
        let video_url: string | null = null
        if (d.videoFile) video_url = await api.uploadVideo(d.videoFile)
        await api.createConciergeOfferItem({
          offer_id: offer.id,
          title: d.title.trim(),
          city: d.city.trim() || null,
          address: d.address.trim() || null,
          price: d.price ? Number(d.price) : null,
          rooms: d.rooms ? Number(d.rooms) : null,
          realtor_name: d.realtorName.trim() || null,
          realtor_phone: d.realtorPhone.trim() || null,
          notes: d.notes.trim() || null,
          image_urls,
          video_url,
        })
      }))
      try {
        await api.createNotification({
          user_id: req.user_id,
          type: 'concierge_fulfilled',
          preview: 'Your concierge request has been fulfilled — your offers are ready to view.',
        })
      } catch { /* notification failure must not block the offer */ }
      qc.invalidateQueries({ queryKey: ['admin-concierge'] })
      toast.success('Offer submitted to user')
      setDrafts([emptyDraft()])
      setOfferTitle('')
      setOpen(false)
    } catch (e) {
      toast.error((e as Error).message || 'Could not submit offer')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteItem = useMutation({
    mutationFn: (id: string) => api.deleteConciergeOfferItem(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-concierge'] }); toast.success('Item removed') },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="card p-4">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar src={req.user?.avatar_url} name={req.user?.full_name ?? '?'} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-bold text-sand-900 dark:text-white">
              {req.user?.full_name ?? 'Premium user'} — {req.city}
            </p>
            <p className="text-xs text-sand-400">
              {req.budget_min?.toLocaleString() ?? '?'} – {req.budget_max?.toLocaleString() ?? '?'} MAD
              {req.rooms != null ? ` · ${req.rooms} rooms` : ''}
              {' · '}{formatRelativeTime(req.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={req.status === 'fulfilled' ? 'green' : req.status === 'cancelled' ? 'neutral' : 'gold'}>
            {req.status}
          </Badge>
          {open ? <ChevronUp size={16} className="text-sand-400" /> : <ChevronDown size={16} className="text-sand-400" />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-4 border-t border-sand-100 pt-4 dark:border-[#222D2B]">
              {req.notes && (
                <p className="text-sm text-sand-600 dark:text-sand-300 italic">"{req.notes}"</p>
              )}
              {req.move_in_date && (
                <p className="text-xs text-sand-400">Move-in: {new Date(req.move_in_date).toLocaleDateString()}</p>
              )}

              {/* Existing offer items */}
              {allItems.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-sand-400 uppercase tracking-wide">
                    {allItems.length} offer item{allItems.length !== 1 ? 's' : ''} sent
                  </p>
                  {allItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-xl border border-sand-100 p-3 dark:border-[#2A2A26]">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-sand-900 dark:text-white">{item.title}</p>
                        {item.realtor_name && (
                          <p className="text-xs text-sand-400 flex items-center gap-1">
                            <User size={10} /> {item.realtor_name}
                            {item.realtor_phone && <><Phone size={10} /> {item.realtor_phone}</>}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteItem.mutate(item.id)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new offer */}
              {!hasOffer && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-sand-400 uppercase tracking-wide">
                    Create offer ({drafts.length}/10 items)
                  </p>
                  {drafts.map((d, i) => (
                    <OfferItemRow
                      key={i}
                      draft={d}
                      index={i}
                      onChange={(nd) => setDrafts((prev) => prev.map((x, j) => j === i ? nd : x))}
                      onRemove={() => setDrafts((prev) => prev.filter((_, j) => j !== i))}
                    />
                  ))}
                  {drafts.length < 10 && (
                    <button
                      type="button"
                      onClick={() => setDrafts((prev) => [...prev, emptyDraft()])}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-primary-300 py-2.5 text-xs font-semibold text-primary-500 hover:border-primary-400"
                    >
                      <Plus size={14} /> Add offer item
                    </button>
                  )}
                  <input
                    className="input-field w-full"
                    placeholder="Offer title (e.g. 'Top picks for Casablanca')"
                    value={offerTitle}
                    onChange={(e) => setOfferTitle(e.target.value)}
                  />
                  <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Submit offers to user'}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function AdminPage() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const me = useAuthStore((s) => s.profile)
  const qc = useQueryClient()
  const [tab, setTab] = useState<'reports' | 'concierge' | 'premium'>('reports')

  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: api.getReports,
    enabled: !!me?.is_admin,
  })

  const { data: conciergeRequests = [], isLoading: loadingConcierge } = useQuery({
    queryKey: ['admin-concierge'],
    queryFn: api.getAllConciergeRequests,
    enabled: !!me?.is_admin && tab === 'concierge',
  })

  const { data: premiumRequests = [], isLoading: loadingPremium } = useQuery({
    queryKey: ['admin-premium-requests'],
    queryFn: api.getPremiumRequests,
    enabled: !!me?.is_admin && tab === 'premium',
  })

  const approveReq = useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      api.approvePremiumRequest(id, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-premium-requests'] })
      toast.success('Account upgraded to Main Character Mode 👑')
    },
    onError: (e: Error) => toast.error(e.message || 'Could not approve'),
  })

  const rejectReq = useMutation({
    mutationFn: (id: string) => api.rejectPremiumRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-premium-requests'] })
      toast.success('Request rejected')
    },
    onError: (e: Error) => toast.error(e.message || 'Could not reject'),
  })

  const ban = useMutation({
    mutationFn: ({ userId, banned }: { userId: string; banned: boolean }) =>
      api.setUserBan(userId, banned),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['reports'] })
      qc.invalidateQueries({ queryKey: ['profiles'] })
      toast.success(v.banned ? 'User banned for 24 hours' : 'Ban lifted')
    },
    onError: (e: Error) => toast.error(e.message || 'Could not update the ban'),
  })

  const resolve = useMutation({
    mutationFn: (id: string) => api.resolveReport(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports'] })
      toast.success('Report resolved')
    },
    onError: (e: Error) => toast.error(e.message || 'Could not resolve the report'),
  })

  // Group reports by the user they target — the unit moderation acts on.
  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>()
    for (const r of reports ?? []) {
      const key = r.reported_user_id ?? '_none'
      if (!map.has(key)) map.set(key, { userId: r.reported_user_id, reports: [] })
      map.get(key)!.reports.push(r)
    }
    // Most-reported users first.
    return [...map.values()].sort((a, b) => b.reports.length - a.reports.length)
  }, [reports])

  // Hidden route — anyone who isn't an admin just sees a not-found screen.
  if (!me?.is_admin) {
    return (
      <div className="page-container">
        <EmptyState
          icon="🔒"
          title={t('admin.no_access_title')}
          description={t('admin.no_access_desc')}
          action={<Button onClick={() => navigate('/discover')}>{t('backToDiscover')}</Button>}
        />
      </div>
    )
  }

  const openCount = (reports ?? []).filter((r) => !r.resolved).length

  return (
    <div className="page-container max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <h1 className="text-2xl sm:text-3xl font-black text-sand-900 dark:text-white tracking-tight">
          {t('admin.page_title')}
        </h1>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setTab('reports')}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
              tab === 'reports'
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                : 'text-sand-500 hover:bg-sand-100 dark:hover:bg-[#2A2A26]',
            )}
          >
            <ShieldAlert size={15} /> {t('admin.reports_tab')}
            {openCount > 0 && (
              <span className="ml-0.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {openCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('concierge')}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
              tab === 'concierge'
                ? 'bg-gold-100 text-gold-700 dark:bg-gold-900/20 dark:text-gold-300'
                : 'text-sand-500 hover:bg-sand-100 dark:hover:bg-[#2A2A26]',
            )}
          >
            <Crown size={15} /> {t('admin.orders_tab')}
            {conciergeRequests.filter((r) => r.status === 'pending').length > 0 && (
              <span className="ml-0.5 rounded-full bg-gold-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {conciergeRequests.filter((r) => r.status === 'pending').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('premium')}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
              tab === 'premium'
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
                : 'text-sand-500 hover:bg-sand-100 dark:hover:bg-[#2A2A26]',
            )}
          >
            <Crown size={15} /> {t('admin.approvals_tab')}
            {premiumRequests.filter((r) => r.status === 'pending').length > 0 && (
              <span className="ml-0.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {premiumRequests.filter((r) => r.status === 'pending').length}
              </span>
            )}
          </button>
        </div>
      </motion.div>

      {tab === 'reports' && (
        <>
          <p className="mb-4 text-sm text-sand-500 dark:text-sand-400">
            {isLoading ? t('admin.loading_reports') : `${openCount} ${openCount === 1 ? t('admin.open_report_singular') : t('admin.open_reports_plural')}`}
            {' · '}{t('admin.auto_ban')}
          </p>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
            </div>
          ) : groups.length === 0 ? (
            <EmptyState icon="✅" title={t('admin.no_reports')} description={t('admin.no_reports_desc')} />
          ) : (
            <div className="space-y-3">
              {groups.map((g) => {
            const user = g.userId
              ? g.reports.find((r) => r.reported_user)?.reported_user ?? null
              : null
            const reporters = new Set(g.reports.map((r) => r.reporter_id)).size
            const banned = isBanned(user?.banned_until, user?.is_banned)

            return (
              <motion.div
                key={g.userId ?? '_none'}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-4"
              >
                <div className="flex items-center gap-3">
                  {user ? (
                    <button
                      onClick={() => navigate(`/profile/${user.id}`)}
                      className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80"
                    >
                      <Avatar src={user.avatar_url} name={user.full_name} size="md" />
                      <div className="min-w-0">
                        <p className="truncate font-bold text-sand-900 dark:text-white">
                          {user.full_name}
                        </p>
                        <p className="text-xs text-sand-400">
                          {g.reports.length} report{g.reports.length === 1 ? '' : 's'}
                          {' · '}{reporters} distinct reporter{reporters === 1 ? '' : 's'}
                        </p>
                      </div>
                    </button>
                  ) : (
                    <div className="flex-1">
                      <p className="font-bold text-sand-900 dark:text-white">{t('admin.realtor')}</p>
                      <p className="text-xs text-sand-400">{g.reports.length} report(s)</p>
                    </div>
                  )}

                  {banned ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-600 dark:bg-red-900/30 dark:text-red-300">
                      <Ban size={11} /> {t('admin.banned')}
                    </span>
                  ) : reporters >= 5 ? (
                    <Badge variant="gold">{t('admin.ban_threshold')}</Badge>
                  ) : null}

                  {user && (
                    <Button
                      size="sm"
                      variant={banned ? 'outline' : 'default'}
                      disabled={ban.isPending}
                      onClick={() => ban.mutate({ userId: user.id, banned: !banned })}
                    >
                      {ban.isPending && ban.variables?.userId === user.id
                        ? <Loader2 size={14} className="animate-spin" />
                        : banned
                          ? <><ShieldCheck size={14} /> {t('admin.unban')}</>
                          : <><Ban size={14} /> {t('admin.ban_24h')}</>}
                    </Button>
                  )}
                </div>

                <div className="mt-3 space-y-2 border-t border-sand-100 pt-3 dark:border-[#222D2B]">
                  {g.reports.map((r) => (
                    <div key={r.id} className="flex items-start gap-2 text-sm">
                      <Badge variant="neutral" className="mt-0.5 capitalize">{r.target_type}</Badge>
                      <div className="min-w-0 flex-1">
                        <p className={r.resolved ? 'text-sand-400 line-through' : 'text-sand-700 dark:text-sand-200'}>
                          {r.reason ?? t('admin.no_reason')}
                        </p>
                        <p className="text-[11px] text-sand-400">
                          by {r.reporter?.full_name ?? 'Student'} · {formatRelativeTime(r.created_at)}
                        </p>
                      </div>
                      {r.resolved ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
                          <CheckCircle2 size={13} /> {t('admin.resolved')}
                        </span>
                      ) : (
                        <button
                          onClick={() => resolve.mutate(r.id)}
                          disabled={resolve.isPending}
                          className="text-[11px] font-semibold text-primary-600 hover:underline dark:text-primary-300"
                        >
                          {t('admin.resolve')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )
          })}
            </div>
          )}
        </>
      )}

      {tab === 'concierge' && (
        <>
          <p className="mb-4 text-sm text-sand-500 dark:text-sand-400">
            {loadingConcierge
              ? t('admin.loading_orders')
              : `${conciergeRequests.length} total · ${conciergeRequests.filter((r) => r.status === 'pending').length} pending`}
          </p>
          {loadingConcierge ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : conciergeRequests.length === 0 ? (
            <EmptyState icon="👑" title={t('admin.no_orders')} description={t('admin.no_orders_desc')} />
          ) : (
            <div className="space-y-3">
              {conciergeRequests.map((req) => (
                <ConciergeCard key={req.id} req={req} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'premium' && (
        <>
          <p className="mb-4 text-sm text-sand-500 dark:text-sand-400">
            {loadingPremium
              ? t('admin.loading_upgrades')
              : `${premiumRequests.length} total · ${premiumRequests.filter((r) => r.status === 'pending').length} pending`}
          </p>
          {loadingPremium ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
            </div>
          ) : premiumRequests.length === 0 ? (
            <EmptyState icon="👑" title={t('admin.no_upgrades')} description={t('admin.no_upgrades_desc')} />
          ) : (
            <div className="space-y-3">
              {premiumRequests.map((req) => {
                const isPending = req.status === 'pending'
                return (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card p-4"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={req.user?.avatar_url ?? null}
                        name={req.user?.full_name ?? '?'}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sand-900 dark:text-white truncate">
                          {req.user?.full_name ?? 'Unknown user'}
                        </p>
                        <p className="text-xs text-sand-400">
                          {new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <Badge variant={req.status === 'approved' ? 'green' : req.status === 'rejected' ? 'neutral' : 'gold'}>
                        {req.status}
                      </Badge>
                    </div>

                    {safeReceiptUrl(req.receipt_url) && (
                      <a
                        href={safeReceiptUrl(req.receipt_url)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 block overflow-hidden rounded-xl border border-sand-100 dark:border-[#2A2A26]"
                      >
                        <img
                          src={safeReceiptUrl(req.receipt_url)!}
                          alt="Payment receipt"
                          className="w-full max-h-64 object-contain bg-sand-50 dark:bg-[#13191A] hover:opacity-90 transition"
                        />
                      </a>
                    )}

                    {isPending && (
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                          disabled={approveReq.isPending || rejectReq.isPending}
                          onClick={() => approveReq.mutate({ id: req.id, userId: req.user_id })}
                        >
                          {approveReq.isPending && approveReq.variables?.id === req.id
                            ? <Loader2 size={14} className="animate-spin" />
                            : <CheckCircle2 size={14} />}
                          Approve — Activate 👑
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-red-300 text-red-500 hover:bg-red-50"
                          disabled={approveReq.isPending || rejectReq.isPending}
                          onClick={() => rejectReq.mutate(req.id)}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
