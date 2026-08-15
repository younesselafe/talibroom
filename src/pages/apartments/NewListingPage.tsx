import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft, ImagePlus, Video, Loader2, Home, X } from 'lucide-react'
import { MOROCCAN_CITIES } from '@/types'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatPrice } from '@/lib/utils'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/LanguageContext'

export default function NewListingPage() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { id } = useParams()
  const editing = Boolean(id)
  const me = useAuthStore((s) => s.profile)

  const [form, setForm] = useState({
    title: '', price: 2000, city: '', address: '', rooms: 1, totalSlots: 1, description: '',
  })
  // Up to 3 images: existing (remote URLs from DB) + new files picked by the user.
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [existingVideo, setExistingVideo] = useState<string | null>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  // In edit mode, load the listing and pre-fill the form once.
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['apartment', id],
    queryFn: () => api.getApartment(id!),
    enabled: editing,
  })
  const prefilled = useRef(false)
  useEffect(() => {
    if (!existing || prefilled.current) return
    prefilled.current = true
    setForm({
      title: existing.title,
      price: existing.price,
      city: existing.city,
      address: existing.address ?? '',
      rooms: existing.rooms,
      totalSlots: existing.total_slots,
      description: existing.description ?? '',
    })
    setExistingImages(existing.image_urls ?? [])
    setExistingVideo(existing.video_url ?? null)
  }, [existing])

  const MAX_PHOTOS = 3
  const APT_LIMIT = me?.is_premium ? 10 : 3
  const totalCount = existingImages.length + newFiles.length
  const valid = Boolean(form.title.trim() && form.city && form.price > 0)

  const { data: dailyAptCount = 0 } = useQuery({
    queryKey: ['daily-apt-count'],
    queryFn: api.getDailyApartmentCount,
    enabled: !editing, // only relevant for new listings
  })

  const pickVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await api.validateVideo(file, 30)
      setVideoFile(file)
      setExistingVideo(null)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Invalid video')
    }
    e.target.value = ''
  }

  const addFiles = (picked: FileList | null) => {
    if (!picked) return
    const toAdd = Array.from(picked).slice(0, MAX_PHOTOS - totalCount)
    setNewFiles((prev) => [...prev, ...toAdd].slice(0, MAX_PHOTOS))
  }

  const publish = useMutation({
    mutationFn: async () => {
      // Upload any newly picked files; preserve remote URLs unchanged.
      const uploaded = await Promise.all(
        newFiles.map((f) => api.uploadImage('apartment-images', f)),
      )
      const image_urls = [...existingImages, ...uploaded]

      let video_url: string | null = existingVideo ?? null
      if (videoFile) {
        video_url = await api.uploadVideo(videoFile)
        qc.invalidateQueries({ queryKey: ['daily-video-count'] })
      }

      if (editing && existing) {
        // Preserve how many slots are already taken when the total changes.
        const taken = existing.total_slots - existing.available_slots
        await api.updateApartment(existing.id, {
          title: form.title.trim(),
          price: form.price,
          rooms: form.rooms,
          city: form.city,
          address: form.address.trim() || null,
          description: form.description || null,
          image_urls,
          video_url,
          total_slots: form.totalSlots,
          available_slots: Math.max(0, Math.min(form.totalSlots, form.totalSlots - taken)),
        })
        return existing.id
      }
      const created = await api.createApartment({
        title: form.title.trim(),
        price: form.price,
        rooms: form.rooms,
        city: form.city,
        address: form.address.trim(),
        description: form.description,
        image_urls,
        video_url,
        total_slots: form.totalSlots,
        ownerType: me?.account_type === 'realtor' ? 'realtor' : 'student',
      })
      return created.id
    },
    onSuccess: (aptId) => {
      qc.invalidateQueries({ queryKey: ['apartments'] })
      qc.invalidateQueries({ queryKey: ['apartment', aptId] })
      if (!editing) qc.invalidateQueries({ queryKey: ['daily-apt-count'] })
      toast.success(editing ? t('apt.new.listing_updated') : t('apt.new.listing_live'))
      navigate('/my-listings')
    },
    onError: (e: Error) => toast.error(e.message || t('apt.new.save_error')),
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) {
      toast.error(t('apt.new.validation'))
      return
    }
    if (!editing && dailyAptCount >= APT_LIMIT) {
      toast.error(t('apt.new.daily_limit_msg', { count: APT_LIMIT }))
      return
    }
    publish.mutate()
  }

  const item = {
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
  }

  if (editing && loadingExisting) {
    return (
      <div className="page-container max-w-2xl space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  return (
    <div className="page-container max-w-2xl">
      <button onClick={() => navigate(-1)} className="btn-ghost mb-4 -ml-3">
        <ArrowLeft size={18} /> {t('back')}
      </button>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-2 text-primary-500 mb-1">
          <Home size={20} />
          <span className="text-xs font-bold uppercase tracking-wide">{t('apt.new.student_label')}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-sand-900 dark:text-white">
          {editing ? t('apt.new.title_edit') : t('apt.new.title_create')}
        </h1>
        <p className="text-sand-500 dark:text-sand-400 mt-1">
          {t('apt.new.subtitle')}
        </p>
      </motion.div>

      <motion.form
        onSubmit={submit}
        initial="initial"
        animate="animate"
        transition={{ staggerChildren: 0.06 }}
        className="space-y-5"
      >
        {/* Photos — up to 3 */}
        <motion.div variants={item}>
          <Label className="mb-1.5 block">
            Photos <span className="text-sand-400 font-normal">({totalCount}/{MAX_PHOTOS})</span>
          </Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {/* Existing remote images */}
            {existingImages.map((url, i) => (
              <div key={url} className="relative w-24 h-24 rounded-xl overflow-hidden">
                <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setExistingImages((p) => p.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"
                >
                  <X size={11} className="text-white" />
                </button>
              </div>
            ))}
            {/* New files preview */}
            {newFiles.map((f, i) => (
              <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden">
                <img src={URL.createObjectURL(f)} alt={`New photo ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setNewFiles((p) => p.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"
                >
                  <X size={11} className="text-white" />
                </button>
              </div>
            ))}
            {/* Add button */}
            {totalCount < MAX_PHOTOS && (
              <label className="w-24 h-24 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-sand-200 dark:border-[#2F3B39] cursor-pointer hover:border-primary-400 transition-colors">
                <input type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
                <ImagePlus size={22} className="text-sand-400" />
                <span className="text-[10px] text-sand-400 mt-1">{t('apt.new.add_photo')}</span>
              </label>
            )}
          </div>
        </motion.div>

        {/* Video tour — premium only, max 30s */}
        {me?.is_premium && (
          <motion.div variants={item}>
            <Label className="mb-1.5 block">{t('apt.new.video_tour')} <span className="text-gold-500 font-semibold text-xs">{t('apt.new.premium_label')}</span></Label>
            <input ref={videoInputRef} type="file" accept="video/*" hidden onChange={pickVideo} />
            {(existingVideo || videoFile) ? (
              <div className="relative inline-block">
                <video
                  src={videoFile ? URL.createObjectURL(videoFile) : existingVideo!}
                  controls
                  className="h-32 rounded-xl bg-black"
                />
                <button
                  type="button"
                  onClick={() => { setVideoFile(null); setExistingVideo(null) }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"
                >
                  <X size={11} className="text-white" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="flex items-center gap-2 rounded-xl border-2 border-dashed border-gold-300 dark:border-gold-700/50 px-4 py-3 text-sm font-medium text-gold-600 dark:text-gold-400 hover:border-gold-400 transition-colors"
              >
                <Video size={18} /> {t('apt.new.add_video')}
              </button>
            )}
          </motion.div>
        )}

        <motion.div variants={item} className="space-y-1.5">
          <Label htmlFor="title">{t('apt.new.title_field')}</Label>
          <Input id="title" value={form.title} onChange={(e) => set('title', e.target.value)}
                 placeholder={t('apt.new.title_placeholder')} />
        </motion.div>

        <motion.div variants={item} className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>{t('city')}</Label>
            <Select value={form.city} onValueChange={(v) => set('city', v)}>
              <SelectTrigger><SelectValue placeholder={t('apt.new.select_city')} /></SelectTrigger>
              <SelectContent>
                {MOROCCAN_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rooms">{t('apt.new.rooms_label')}</Label>
            <Input id="rooms" type="number" min={1} max={10} value={form.rooms}
                   onChange={(e) => set('rooms', Number(e.target.value))} />
          </div>
        </motion.div>

        <motion.div variants={item} className="space-y-1.5">
          <Label htmlFor="address">{t('apt.new.address_label')}</Label>
          <Input id="address" value={form.address} onChange={(e) => set('address', e.target.value)}
                 placeholder={t('apt.new.address_placeholder')} />
          <p className="text-xs text-sand-400">
            {t('apt.new.address_hint')}
          </p>
        </motion.div>

        <motion.div variants={item} className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>{t('apt.new.price_label')}</Label>
            <span className="font-black text-primary-600 dark:text-primary-400">{formatPrice(form.price)}</span>
          </div>
          <input
            type="range" min={500} max={8000} step={100} value={form.price}
            onChange={(e) => set('price', Number(e.target.value))}
            className="w-full accent-primary-500 cursor-pointer"
          />
        </motion.div>

        <motion.div variants={item} className="space-y-1.5">
          <Label htmlFor="slots">{t('apt.new.slots_label')}</Label>
          <Input id="slots" type="number" min={1} max={6} value={form.totalSlots}
                 onChange={(e) => set('totalSlots', Number(e.target.value))} />
        </motion.div>

        <motion.div variants={item} className="space-y-1.5">
          <Label htmlFor="desc">{t('apt.new.desc_label')}</Label>
          <Textarea id="desc" value={form.description} onChange={(e) => set('description', e.target.value)}
                    placeholder={t('apt.new.desc_placeholder')} rows={5} />
        </motion.div>

        <motion.div variants={item}>
          <Card className="p-4 bg-primary-50 dark:bg-primary-900/10 border-primary-100 dark:border-primary-900/30">
            <p className="text-xs text-primary-700 dark:text-primary-300">
              {t('apt.new.student_hint1')} <strong>{t('student')}</strong> {t('apt.new.student_hint2')}
            </p>
          </Card>
        </motion.div>

        {!editing && (
          <div className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium ${
            dailyAptCount >= APT_LIMIT
              ? 'bg-gold-50 dark:bg-gold-900/20 border border-gold-200 dark:border-gold-700/40 text-gold-700 dark:text-gold-400'
              : 'bg-sand-50 dark:bg-[#1C201E] border border-sand-200 dark:border-[#2A2A26] text-sand-500 dark:text-sand-400'
          }`}>
            <span>
              {dailyAptCount >= APT_LIMIT
                ? t('apt.new.limit_reached')
                : `${APT_LIMIT - dailyAptCount} ${APT_LIMIT - dailyAptCount === 1 ? t('apt.new.listing_singular') : t('apt.new.listing_plural')} ${t('apt.new.remaining')}`}
            </span>
            <span className="font-black">
              {dailyAptCount} / {APT_LIMIT}
            </span>
          </div>
        )}
        <motion.div variants={item} whileTap={{ scale: 0.99 }}>
          <Button
            type="submit"
            disabled={publish.isPending || !valid || (!editing && dailyAptCount >= APT_LIMIT)}
            className="w-full"
            size="lg"
          >
            {publish.isPending
              ? <Loader2 size={18} className="animate-spin" />
              : editing ? t('saveChanges') : t('apt.new.publish')}
          </Button>
        </motion.div>
      </motion.form>
    </div>
  )
}
