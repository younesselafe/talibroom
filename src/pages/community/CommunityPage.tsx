import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Heart, MessageCircle, Share2, Image as ImageIcon, Send,
  ShoppingBag, Sparkles, Tag, BadgeCheck, Loader2, X, Video, Copy,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { MARKETPLACE_CATEGORIES } from '@/types'
import type { Post } from '@/types'
import Avatar from '@/components/shared/Avatar'
import EmptyState from '@/components/shared/EmptyState'
import Lightbox from '@/components/shared/Lightbox'
import ReportButton from '@/components/shared/ReportButton'
import SkeletonGrid from '@/components/shared/SkeletonCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn, formatRelativeTime } from '@/lib/utils'
import { staggerContainer, staggerItem } from '@/components/ui/motion'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/LanguageContext'

// ─── Compose box ───────────────────────────────────────────────────────────────

const MAX_MARKET_PHOTOS = 3

function Composer({ kind }: { kind: 'social' | 'marketplace' }) {
  const { t } = useLanguage()
  const me = useAuthStore((s) => s.profile)
  const qc = useQueryClient()
  const fileRef  = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)

  const [value, setValue]       = useState('')
  const [focused, setFocused]   = useState(false)
  const [category, setCategory] = useState<string>(MARKETPLACE_CATEGORIES[0])
  const [files, setFiles]       = useState<File[]>([])
  const [videoFile, setVideoFile] = useState<File | null>(null)

  const previewUrls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])
  const maxPhotos   = kind === 'marketplace' ? MAX_MARKET_PHOTOS : 1

  const MARKET_LIMIT = me?.is_premium ? 10 : 3
  const VIDEO_LIMIT  = me?.is_premium ? 5  : 0

  const { data: dailyMarketCount = 0 } = useQuery({
    queryKey: ['daily-market-count'],
    queryFn: () => api.getDailyPostCount('marketplace'),
    enabled: kind === 'marketplace',
  })
  const { data: dailyVideoCount = 0 } = useQuery({
    queryKey: ['daily-video-count'],
    queryFn: api.getDailyVideoCount,
    enabled: kind === 'social' && !!me?.is_premium,
  })
  const atMarketLimit = kind === 'marketplace' && dailyMarketCount >= MARKET_LIMIT

  const create = useMutation({
    mutationFn: async () => {
      if (kind === 'marketplace') {
        const count = await api.getDailyPostCount('marketplace')
        if (count >= MARKET_LIMIT) throw new Error(`You can list up to ${MARKET_LIMIT} items per day`)
      }
      const uploaded = await Promise.all(files.map((f) => api.uploadImage('post-images', f)))
      let videoUrl: string | null = null
      if (videoFile) {
        await api.validateVideo(videoFile, 20)
        videoUrl = await api.uploadVideo(videoFile)
        qc.invalidateQueries({ queryKey: ['daily-video-count'] })
      }
      return api.createPost({
        content: value.trim(),
        type: kind,
        category: kind === 'marketplace' ? category : 'Other',
        image_url: uploaded[0] ?? null,
        image_urls: uploaded,
        video_url: videoUrl,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posts'] })
      toast.success(kind === 'social' ? t('postShared') : t('itemListed'))
      setValue(''); setFiles([]); setVideoFile(null); setFocused(false)
    },
    onError: (e: Error) => toast.error(e.message || 'Could not post — please try again'),
  })

  const pickVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (dailyVideoCount >= VIDEO_LIMIT) {
      toast.error(`You've reached the ${VIDEO_LIMIT} videos/day limit.`)
      e.target.value = ''
      return
    }
    try {
      await api.validateVideo(file, 20)
      setFiles([])
      setVideoFile(file)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Invalid video')
    }
    e.target.value = ''
  }

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-4">
      <div className="flex gap-3">
        <Avatar src={me?.avatar_url} name={me?.full_name ?? 'You'} size="md" isPremium={me?.is_premium}
                seed={me?.id} gender={me?.gender} lifestyle={me?.lifestyle_json} />
        <div className="flex-1">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder={kind === 'social'
              ? t('whatHappeningOnCampus')
              : t('sellingDesc')}
            rows={focused ? 3 : 1}
            className="w-full bg-transparent text-sm text-sand-900 dark:text-sand-100 placeholder:text-sand-400 resize-none focus:outline-none transition-all"
          />

          {previewUrls.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {previewUrls.map((url, i) => (
                <div key={url} className="relative">
                  <img src={url} alt={`Photo ${i + 1}`} className="h-24 rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}
                    aria-label="Remove photo"
                    className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-sand-900 text-white shadow"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {videoFile && (
            <div className="mt-2 relative inline-block">
              <video src={URL.createObjectURL(videoFile)} className="h-24 rounded-lg bg-black" controls />
              <button
                type="button"
                onClick={() => setVideoFile(null)}
                aria-label="Remove video"
                className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-sand-900 text-white shadow"
              >
                <X size={12} />
              </button>
            </div>
          )}

          <AnimatePresence>
            {focused && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-1 border-t border-sand-100 dark:border-[#222D2B]"
              >
                <div className="flex items-center gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple={kind === 'marketplace'}
                    hidden
                    onChange={(e) => {
                      const picked = Array.from(e.target.files ?? [])
                      setVideoFile(null)
                      setFiles((prev) => [...prev, ...picked].slice(0, maxPhotos))
                      e.target.value = ''
                    }}
                  />
                  <input ref={videoRef} type="file" accept="video/*" hidden onChange={pickVideo} />
                  {files.length < maxPhotos && !videoFile && (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="btn-ghost text-primary-500 text-sm"
                    >
                      <ImageIcon size={16} />
                      {kind === 'marketplace'
                        ? `${t('photo')} (${files.length}/${maxPhotos})`
                        : t('photo')}
                    </button>
                  )}
                  {kind === 'social' && me?.is_premium && !files.length && (
                    <button
                      type="button"
                      onClick={() => videoRef.current?.click()}
                      disabled={dailyVideoCount >= VIDEO_LIMIT}
                      title={dailyVideoCount >= VIDEO_LIMIT ? `${VIDEO_LIMIT} videos/day limit reached` : 'Add video (max 20s) ✨'}
                      className="btn-ghost text-gold-500 text-sm disabled:opacity-40"
                    >
                      <Video size={16} /> {t('video')}
                    </button>
                  )}
                  {kind === 'marketplace' && (
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      aria-label="Item category"
                      className="rounded-lg border border-sand-200 bg-transparent px-2 py-1.5 text-sm font-medium text-sand-700 dark:border-[#2F3B39] dark:text-sand-200"
                    >
                      {MARKETPLACE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  )}
                </div>
                {kind === 'marketplace' && (
                  <span className={`text-xs font-semibold ${atMarketLimit ? 'text-gold-600 dark:text-gold-400' : 'text-sand-400'}`}>
                    {atMarketLimit ? t('limitReached') : `${MARKET_LIMIT - dailyMarketCount}/${MARKET_LIMIT} left today`}
                  </span>
                )}
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button
                    size="sm"
                    onClick={() => create.mutate()}
                    disabled={!value.trim() || create.isPending || atMarketLimit}
                  >
                    {create.isPending
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Send size={14} />}
                    {kind === 'social' ? t('post') : t('listItem')}
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Comments ────────────────────────────────────────────────────────────────────

function CommentsSection({ postId, onAdded }: { postId: string; onAdded: () => void }) {
  const { t } = useLanguage()
  const me = useAuthStore((s) => s.profile)
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [text, setText] = useState('')

  const { data: comments, isLoading } = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => api.getComments(postId),
  })

  const add = useMutation({
    mutationFn: () => api.createComment(postId, text.trim()),
    onSuccess: () => {
      setText('')
      onAdded()
      qc.invalidateQueries({ queryKey: ['comments', postId] })
      qc.invalidateQueries({ queryKey: ['posts'] })
    },
    onError: (e: Error) => toast.error(e.message || 'Could not post your comment'),
  })

  const submit = () => {
    if (!text.trim() || add.isPending) return
    add.mutate()
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="mt-3 space-y-3 border-t border-sand-100 pt-3 dark:border-[#222D2B]"
    >
      {isLoading ? (
        <p className="text-xs text-sand-400">{t('community.loading_comments')}</p>
      ) : (comments ?? []).length === 0 ? (
        <p className="text-xs text-sand-400">{t('community.no_comments')}</p>
      ) : (
        (comments ?? []).map((c) => (
          <div key={c.id} className="flex gap-2.5">
            <button onClick={() => navigate(`/profile/${c.user_id}`)} className="hover:opacity-80"
                    aria-label={`View ${c.author?.full_name ?? 'profile'}`}>
              <Avatar src={c.author?.avatar_url} name={c.author?.full_name ?? '?'} size="xs" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="rounded-2xl bg-sand-100 px-3 py-2 dark:bg-[#222D2B]">
                <button
                  onClick={() => navigate(`/profile/${c.user_id}`)}
                  className="text-xs font-bold text-sand-900 dark:text-white hover:underline"
                >
                  {c.author?.full_name ?? 'Student'}
                </button>
                <p className="whitespace-pre-line text-sm text-sand-700 dark:text-sand-200">
                  {c.content}
                </p>
              </div>
              <div className="ml-1 mt-1 flex items-center gap-3">
                <p className="text-[10px] text-sand-400">
                  {formatRelativeTime(c.created_at)}
                </p>
                {me?.id !== c.user_id && (
                  <ReportButton
                    targetType="comment"
                    targetId={c.id}
                    reportedUserId={c.user_id}
                    className="!text-[10px]"
                  />
                )}
              </div>
            </div>
          </div>
        ))
      )}

      <div className="flex items-center gap-2">
        <Avatar src={me?.avatar_url} name={me?.full_name ?? 'You'} size="xs"
                seed={me?.id} gender={me?.gender} lifestyle={me?.lifestyle_json} />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
          }}
          placeholder={t('community.write_comment')}
          className="input-field h-9 flex-1 text-sm"
        />
        <Button size="icon" onClick={submit} disabled={!text.trim() || add.isPending}>
          {add.isPending
            ? <Loader2 size={14} className="animate-spin" />
            : <Send size={14} />}
        </Button>
      </div>
    </motion.div>
  )
}

// ─── Feed post ─────────────────────────────────────────────────────────────────

function FeedPost({ post }: { post: Post }) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const me = useAuthStore((s) => s.profile)
  const [liked, setLiked] = useState(post.user_has_liked ?? false)
  const [likes, setLikes] = useState(post.likes_count ?? 0)
  const [busy, setBusy]   = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [commentCount, setCommentCount] = useState(post.comments_count ?? 0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const toggleLike = async () => {
    if (busy) return
    const next = !liked
    setLiked(next)
    setLikes((n) => n + (next ? 1 : -1))
    setBusy(true)
    try {
      if (next) await api.likePost(post.id)
      else await api.unlikePost(post.id)
    } catch (e) {
      setLiked(!next)                       // revert on failure
      setLikes((n) => n + (next ? -1 : 1))
      toast.error((e as Error).message || 'Could not update like')
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.article variants={staggerItem} className="card p-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/profile/${post.user_id}`)} className="hover:opacity-80"
                aria-label={`View ${post.author?.full_name ?? 'profile'}`}>
          <Avatar src={post.author?.avatar_url} name={post.author?.full_name ?? '?'} size="md"
                  isPremium={post.author?.is_premium} />
        </button>
        <div className="flex-1 min-w-0">
          <button
            onClick={() => navigate(`/profile/${post.user_id}`)}
            className="font-bold text-sand-900 dark:text-white text-sm flex items-center gap-1 hover:underline"
          >
            {post.author?.full_name}
            {post.author?.is_premium && <BadgeCheck size={14} className="text-gold-500" />}
          </button>
          <p className="text-xs text-sand-400">
            {post.author?.city} · {formatRelativeTime(post.created_at)}
          </p>
        </div>
      </div>

      <p className="mt-3 text-sand-700 dark:text-sand-200 text-[15px] leading-relaxed whitespace-pre-line">
        {post.content}
      </p>

      {post.image_url && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 rounded-xl overflow-hidden">
          <button type="button" onClick={() => setLightboxOpen(true)} className="block w-full" aria-label="View photo fullscreen">
            <img src={post.image_url} alt="" loading="lazy" decoding="async" className="w-full max-h-96 object-cover hover:opacity-90 transition cursor-zoom-in" />
          </button>
        </motion.div>
      )}
      {lightboxOpen && post.image_url && (
        <Lightbox images={[post.image_url]} index={0} onClose={() => setLightboxOpen(false)} />
      )}
      {post.video_url && (
        <div className="mt-3 rounded-xl overflow-hidden bg-black">
          <video src={post.video_url} controls playsInline className="w-full max-h-96" />
        </div>
      )}

      <div className="mt-4 flex items-center gap-1 border-t border-sand-100 dark:border-[#222D2B] pt-3">
        <button
          onClick={toggleLike}
          aria-pressed={liked}
          aria-label={liked ? t('community.unlike') : t('community.like_post')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors',
            liked ? 'text-primary-500' : 'text-sand-500 hover:bg-sand-100 dark:hover:bg-[#222D2B]',
          )}
        >
          <motion.span animate={liked ? { scale: [1, 1.4, 1] } : { scale: 1 }} transition={{ duration: 0.35 }}>
            <Heart size={17} fill={liked ? 'currentColor' : 'none'} />
          </motion.span>
          {likes}
        </button>
        <button
          onClick={() => setShowComments((s) => !s)}
          aria-expanded={showComments}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors',
            showComments
              ? 'text-primary-500'
              : 'text-sand-500 hover:bg-sand-100 dark:hover:bg-[#222D2B]',
          )}
        >
          <MessageCircle size={17} /> {commentCount}
        </button>
        <button
          onClick={async () => {
            try {
              if (navigator.share) {
                await navigator.share({ text: post.content })
              } else {
                await navigator.clipboard.writeText(post.content)
                toast.success(t('copiedToClipboard'))
              }
            } catch {
              /* share sheet dismissed — nothing to do */
            }
          }}
          aria-label={t('community.share_post')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-sand-500 hover:bg-sand-100 dark:hover:bg-[#222D2B] transition-colors ml-auto"
        >
          <Share2 size={16} />
        </button>
        {me?.id !== post.user_id && (
          <ReportButton
            targetType="post"
            targetId={post.id}
            reportedUserId={post.user_id}
            className="px-3 py-1.5"
          />
        )}
      </div>

      <AnimatePresence initial={false}>
        {showComments && (
          <CommentsSection
            postId={post.id}
            onAdded={() => setCommentCount((n) => n + 1)}
          />
        )}
      </AnimatePresence>
    </motion.article>
  )
}

// ─── Marketplace item ──────────────────────────────────────────────────────────

function MarketItem({ post }: { post: Post }) {
  const { t } = useLanguage()
  const me = useAuthStore((s) => s.profile)
  const navigate = useNavigate()
  const [sent, setSent] = useState(false)
  const mine = me?.id === post.user_id
  const [lbIdx, setLbIdx] = useState<number | null>(null)
  const allImages = post.image_urls?.length > 0 ? post.image_urls : (post.image_url ? [post.image_url] : [])

  const contact = useMutation({
    mutationFn: () => api.startConversation({
      receiver_id: post.user_id,
      kind: 'marketplace',
      context_id: post.id,
      context_label: post.content.slice(0, 60),
      openingMessage: t('msg_marketplace_interest'),
    }),
    onSuccess: () => { setSent(true); toast.success(t('community.seller_messaged')) },
    onError: (e: Error) => toast.error(e.message || 'Could not contact the seller'),
  })

  return (
    <motion.div variants={staggerItem} whileHover={{ y: -6 }} className="card overflow-hidden group">
      <div className="relative h-44 bg-sand-100 dark:bg-[#222D2B] overflow-hidden">
        {allImages.length > 0 ? (
          <button
            type="button"
            onClick={() => setLbIdx(0)}
            className="block w-full h-full cursor-zoom-in"
            aria-label="View photos fullscreen"
          >
            <motion.img
              src={allImages[0]}
              alt=""
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
              whileHover={{ scale: 1.08 }}
              transition={{ duration: 0.5 }}
            />
          </button>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sand-300">
            <ShoppingBag size={32} />
          </div>
        )}
        {allImages.length > 1 && (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white pointer-events-none">
            1/{allImages.length}
          </span>
        )}
        {lbIdx !== null && allImages.length > 0 && (
          <Lightbox
            images={allImages}
            index={lbIdx}
            onClose={() => setLbIdx(null)}
            onNav={setLbIdx}
          />
        )}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <Badge variant="neutral" className="bg-white/95 backdrop-blur">
            <Tag size={10} /> {post.category}
          </Badge>
          {post.author?.is_premium && (
            <Badge variant="gold" className="bg-white/95 backdrop-blur">
              <Sparkles size={10} /> Premium
            </Badge>
          )}
        </div>
        {!mine && (
          <div className="absolute top-2.5 right-2.5 rounded-full bg-white/90 p-1.5 backdrop-blur dark:bg-black/50">
            <ReportButton targetType="post" targetId={post.id} reportedUserId={post.user_id} />
          </div>
        )}
        {post.is_sold && (
          <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
            <span className="text-white font-black text-lg tracking-wide rotate-[-8deg] border-2 border-white rounded-lg px-4 py-1">
              SOLD
            </span>
          </div>
        )}
      </div>
      {post.video_url && (
        <div className="bg-black">
          <video src={post.video_url} controls playsInline className="w-full max-h-48 object-contain" />
        </div>
      )}
      <div className="p-4">
        <p className="text-sand-700 dark:text-sand-200 text-sm leading-snug line-clamp-2">
          {post.content}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={() => navigate(`/profile/${post.user_id}`)}
            className="flex min-w-0 items-center gap-2 hover:opacity-80"
            aria-label={`View ${post.author?.full_name ?? 'profile'}`}
          >
            <Avatar src={post.author?.avatar_url} name={post.author?.full_name ?? '?'} size="xs" />
            <span className="text-xs text-sand-400 truncate">{post.author?.full_name}</span>
          </button>
          <Button
            size="sm"
            variant={post.is_sold || mine || sent ? 'secondary' : 'default'}
            disabled={post.is_sold || mine || sent || contact.isPending}
            onClick={() => contact.mutate()}
          >
            {post.is_sold ? t('sold') : mine ? t('yourItem') : sent ? t('contacted') : t('iAmInterested')}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

type FeedScope = 'all' | 'city' | 'city_university'

// ─── Support the Dev card ─────────────────────────────────────────────────────

const SUPPORT_OPTIONS = [
  { label: 'RIB', value: 'CIH Bank — 230 810 0000123456789012 00' },
]

function SupportCard() {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-amber-200 dark:border-amber-800/40 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-[#1A1510] dark:to-[#1C1710] overflow-hidden"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <span className="text-2xl flex-shrink-0">☕</span>
        <div className="flex-1 min-w-0">
          <p className="font-black text-amber-900 dark:text-amber-300 text-sm leading-tight">
            {t('community.support_title')}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5 leading-relaxed">
            {t('community.support_short')}
          </p>
        </div>
        <span className="text-amber-600 text-xs font-semibold flex-shrink-0">
          {open ? t('close') : t('community.support_btn')}
        </span>
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
            <div className="px-4 pb-4 space-y-3 border-t border-amber-200 dark:border-amber-800/30 pt-3">
              <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
                {t('community.support_long')}
              </p>
              <div className="space-y-1.5">
                {SUPPORT_OPTIONS.map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between gap-2 rounded-xl border border-amber-200 dark:border-amber-800/30 bg-white/60 dark:bg-black/20 px-3 py-2">
                    <div>
                      <p className="text-[10px] text-amber-600 dark:text-amber-500">{label}</p>
                      <p className="text-xs font-semibold font-mono text-amber-900 dark:text-amber-200">{value}</p>
                    </div>
                    <button
                      onClick={() => { navigator.clipboard.writeText(value); toast.success(t('copied')) }}
                      className="text-amber-500 hover:text-amber-700 transition-colors"
                      aria-label={`Copy ${label}`}
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-center text-[11px] text-amber-600 dark:text-amber-500">
                {t('community.support_thanks')}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function CommunityPage() {
  const { t } = useLanguage()
  const me = useAuthStore((s) => s.profile)
  const [tab, setTab]           = useState<'feed' | 'marketplace'>('feed')
  const [category, setCategory] = useState('all')
  const [scope, setScope]       = useState<FeedScope>('all')

  const feedSentinelRef    = useRef<HTMLDivElement>(null)
  const marketSentinelRef  = useRef<HTMLDivElement>(null)

  const {
    data: postPages,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['posts', 'browse'],
    queryFn: ({ pageParam }) => api.getPostsPage(pageParam),
    getNextPageParam: (lastPage) =>
      lastPage.length >= 20 ? lastPage.at(-1)?.created_at : undefined,
    initialPageParam: undefined as string | undefined,
  })

  const posts = postPages?.pages.flatMap((p) => p) ?? []

  useEffect(() => {
    const refs = [feedSentinelRef.current, marketSentinelRef.current]
    if (!hasNextPage || isFetchingNextPage) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) fetchNextPage() },
      { threshold: 0.1 },
    )
    refs.forEach((r) => r && obs.observe(r))
    return () => obs.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  const feed = useMemo(() => {
    let items = posts.filter((p) => p.type === 'social')
    if (scope === 'city' && me?.city) {
      items = items.filter((p) => p.author?.city === me.city)
    } else if (scope === 'city_university' && me?.city) {
      items = items.filter(
        (p) => p.author?.city === me.city && p.author?.university === me.university,
      )
    }
    return items
  }, [posts, scope, me?.city, me?.university])
  const market = useMemo(() => {
    let items = posts.filter((p) => p.type === 'marketplace')
    if (category !== 'all') items = items.filter((p) => p.category === category)
    return items
  }, [posts, category])

  return (
    <div className="page-container max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <h1 className="text-2xl sm:text-3xl font-black text-sand-900 dark:text-white tracking-tight">
          {t('communityTitle')}
        </h1>
        <p className="text-sand-500 dark:text-sand-400 mt-1">
          {t('communitySubtitle')}
        </p>
      </motion.div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'feed' | 'marketplace')}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="feed" className="flex-1 sm:flex-none">
            <Sparkles size={14} /> {t('feed')}
          </TabsTrigger>
          <TabsTrigger value="marketplace" className="flex-1 sm:flex-none">
            <ShoppingBag size={14} /> {t('marketplace')}
          </TabsTrigger>
        </TabsList>

        {/* FEED */}
        <TabsContent value="feed">
          <div className="space-y-4">
            <Composer kind="social" />
            <SupportCard />

            {/* Location scope — narrow the feed to your city or campus */}
            {me?.city && (
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                {([
                  ['all', t('everyone')],
                  ['city', me.city],
                  ...(me.university ? [['city_university', me.university] as const] : []),
                ] as Array<[FeedScope, string]>).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setScope(value)}
                    className={cn(
                      'whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors',
                      scope === value
                        ? 'bg-primary-500 text-white'
                        : 'bg-sand-100 dark:bg-[#222D2B] text-sand-600 dark:text-sand-300 hover:bg-sand-200 dark:hover:bg-[#2F3B39]',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {isLoading ? (
              <SkeletonGrid count={3} variant="post" />
            ) : feed.length === 0 ? (
              <EmptyState icon="📭" title={t('feedIsQuiet')}
                description={scope === 'all'
                  ? t('beFirstToShare')
                  : t('noPostsInArea')} />
            ) : (
              <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4">
                {feed.map((p) => <FeedPost key={p.id} post={p} />)}
              </motion.div>
            )}
            <div ref={feedSentinelRef} className="h-2 mt-2" />
            {isFetchingNextPage && (
              <div className="flex justify-center py-3">
                <Loader2 size={20} className="animate-spin text-sand-400" />
              </div>
            )}
          </div>
        </TabsContent>

        {/* MARKETPLACE */}
        <TabsContent value="marketplace">
          <div className="space-y-4">
            <Composer kind="marketplace" />

            {/* Category chips */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
              {['all', ...MARKETPLACE_CATEGORIES].map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    'whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors',
                    category === c
                      ? 'bg-primary-500 text-white'
                      : 'bg-sand-100 dark:bg-[#222D2B] text-sand-600 dark:text-sand-300 hover:bg-sand-200 dark:hover:bg-[#2F3B39]',
                  )}
                >
                  {c === 'all' ? t('allItems') : c}
                </button>
              ))}
            </div>

            {isLoading ? (
              <SkeletonGrid count={4} variant="apartment" />
            ) : market.length === 0 ? (
              <EmptyState icon="🛍️" title={t('noItemsForSale')} description={t('tryDifferentCategory')} />
            ) : (
              <motion.div
                key={category}
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                {market.map((p) => <MarketItem key={p.id} post={p} />)}
              </motion.div>
            )}
            <div ref={marketSentinelRef} className="h-2 mt-2" />
            {isFetchingNextPage && (
              <div className="flex justify-center py-3">
                <Loader2 size={20} className="animate-spin text-sand-400" />
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
