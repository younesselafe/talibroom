import { useState, useEffect, useRef, memo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Send, ImagePlus, Video, X } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Message } from '@/types'
import Avatar from '@/components/shared/Avatar'
import Lightbox from '@/components/shared/Lightbox'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatRelativeTime, generateId } from '@/lib/utils'
import { useLanguage } from '@/lib/LanguageContext'

// Memoized — without this every keystroke in the composer re-renders the
// whole message list, which gets janky on long threads / low-end phones.
const Bubble = memo(function Bubble({ msg, mine, onImageClick }: { msg: Message; mine: boolean; onImageClick?: (url: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={cn('flex', mine ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[78%] rounded-2xl text-sm leading-relaxed overflow-hidden',
          mine
            ? 'bg-primary-500 text-white rounded-br-md'
            : 'bg-white dark:bg-[#1C1C1A] text-sand-800 dark:text-sand-200 rounded-bl-md border border-sand-100 dark:border-[#2A2A26]'
        )}
      >
        {msg.image_url && (
          <button
            type="button"
            onClick={() => onImageClick?.(msg.image_url!)}
            className="block w-full"
            aria-label="View photo fullscreen"
          >
            <img src={msg.image_url} alt="Photo" className="w-full max-h-56 object-cover hover:opacity-90 transition" />
          </button>
        )}
        {msg.video_url && (
          <video
            src={msg.video_url}
            controls
            playsInline
            className="w-full max-h-56 bg-black"
          />
        )}
        <div className="px-4 py-2.5">
          {msg.content && msg.content !== '​' && <p className="whitespace-pre-line">{msg.content}</p>}
          <p className={cn('text-[10px] mt-1', mine ? 'text-white/60' : 'text-sand-400')}>
            {formatRelativeTime(msg.created_at)}
          </p>
        </div>
      </div>
    </motion.div>
  )
})

/**
 * Merge an incoming message into the list:
 *  • skip if its id is already present (de-dupes realtime echoes), and
 *  • if an optimistic "temp-" bubble with the same sender + text exists,
 *    replace it in place so the real DB row takes over its slot.
 */
function upsertMessage(list: Message[], incoming: Message): Message[] {
  if (list.some((m) => m.id === incoming.id)) return list
  const tempIdx = list.findIndex(
    (m) => m.id.startsWith('temp-')
      && m.sender_id === incoming.sender_id
      && (
        m.content === incoming.content
        // Photo messages: temp has a blob URL, real row has the Supabase URL.
        // content won't match ('' vs zero-width-space) so fall back to image presence.
        || (m.image_url?.startsWith('blob:') && !!incoming.image_url)
        || (m.video_url?.startsWith('blob:') && !!incoming.video_url)
      ),
  )
  if (tempIdx === -1) return [...list, incoming]
  const next = list.slice()
  next[tempIdx] = incoming
  return next
}

export default function ChatPage() {
  const { t } = useLanguage()
  const { id } = useParams()
  const navigate = useNavigate()
  const me = useAuthStore((s) => s.profile)
  const scrollRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  const { data: link, isLoading: linkLoading } = useQuery({
    queryKey: ['link', id], queryFn: () => api.getLink(id!), enabled: !!id,
    refetchOnMount: 'always',
  })
  // refetchOnMount keeps the thread in sync when returning from another
  // screen — earlier-sent messages are re-fetched from Supabase rather than
  // read from a stale cache, so they never silently disappear.
  const { data: initialMessages, isLoading: msgLoading } = useQuery({
    queryKey: ['messages', id], queryFn: () => api.getMessages(id!), enabled: !!id,
    refetchOnMount: 'always',
  })
  // The partner's last-read time — polled so "Seen" updates without a reload.
  const { data: partnerReadAt } = useQuery({
    queryKey: ['conv-read', id], queryFn: () => api.getPartnerRead(id!), enabled: !!id,
    refetchInterval: 15000,
  })

  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const lastIdRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const { data: dailyImageCount = 0 } = useQuery({
    queryKey: ['chat-daily-images'],
    queryFn: api.getDailyChatImageCount,
    enabled: !!id && !me?.is_premium,
    staleTime: 60_000,
  })
  const { data: dailyVideoCount = 0 } = useQuery({
    queryKey: ['daily-video-count'],
    queryFn: api.getDailyVideoCount,
    enabled: !!id && !!me?.is_premium,
    staleTime: 60_000,
  })

  // Seed from the latest page; a short first page means there's nothing older.
  useEffect(() => {
    if (initialMessages) {
      setMessages(initialMessages)
      setHasMore(initialMessages.length >= 10)
    }
  }, [initialMessages])

  // Auto-scroll to the bottom only when a NEW message arrives at the end —
  // never when older messages are prepended at the top.
  useEffect(() => {
    const lastId = messages[messages.length - 1]?.id ?? null
    if (lastId && lastId !== lastIdRef.current) {
      lastIdRef.current = lastId
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [messages])

  // Load the previous page when the user scrolls near the top, preserving
  // their scroll position so the view doesn't jump.
  const loadOlder = async () => {
    if (loadingOlder || !hasMore || !id || messages.length === 0) return
    setLoadingOlder(true)
    const el = scrollRef.current
    const prevHeight = el?.scrollHeight ?? 0
    try {
      const older = await api.getMessages(id, messages[0].created_at)
      if (older.length < 10) setHasMore(false)
      if (older.length > 0) {
        setMessages((m) => [...older, ...m])
        requestAnimationFrame(() => {
          if (el) el.scrollTop = el.scrollHeight - prevHeight
        })
      }
    } catch {
      /* leave hasMore set — scrolling up again retries */
    } finally {
      setLoadingOlder(false)
    }
  }

  const handleScroll = () => {
    if ((scrollRef.current?.scrollTop ?? 999) < 80) loadOlder()
  }

  // Live updates — append messages inserted into this conversation by either
  // participant. RLS scopes the stream to links the user belongs to.
  useEffect(() => {
    if (!id) return
    const channel = supabase
      .channel(`messages:${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `link_id=eq.${id}` },
        (payload) => setMessages((m) => upsertMessage(m, payload.new as Message)),
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id])

  const partner = link ? (link.sender_id === me?.id ? link.receiver : link.sender) : undefined

  // Presence — the partner counts as online if seen within the last 15 min.
  const partnerOnline = !!partner?.last_seen
    && Date.now() - new Date(partner.last_seen).getTime() < 15 * 60 * 1000

  // Messaging opens once a link is accepted, or immediately for listing
  // threads (apartment / marketplace) — mirrors the messages_insert RLS policy.
  const isListingThread = link?.kind === 'apartment_inquiry' || link?.kind === 'marketplace'
  const canChat = !!link && (link.status === 'accepted' || isListingThread)

  // Read receipt for the latest message — shown only when it's the user's own.
  const lastMsg = messages.length ? messages[messages.length - 1] : undefined
  const receipt = !lastMsg || lastMsg.sender_id !== me?.id
    ? null
    : lastMsg.id.startsWith('temp-')
      ? t('chat.sending')
      : partnerReadAt && new Date(partnerReadAt) >= new Date(lastMsg.created_at)
        ? t('chat.seen')
        : t('chat.delivered')

  // Clear this conversation's unread marker while it is open (and on each new
  // message), then refresh the Inbox so its badge/counts settle.
  useEffect(() => {
    if (!id || messages.length === 0) return
    api.markConversationRead(id)
      .then(() => queryClient.invalidateQueries({ queryKey: ['links'] }))
      .catch(() => {})
  }, [id, messages.length, queryClient])

  const IMAGE_LIMIT = me?.is_premium ? Infinity : 3
  const VIDEO_LIMIT = me?.is_premium ? 5 : 0

  const sendMessage = useMutation({
    mutationFn: async (vars: { tempId: string; content: string; imageFile: File | null; videoFile: File | null }) => {
      let imageUrl: string | null = null
      let videoUrl: string | null = null
      if (vars.imageFile) {
        imageUrl = await api.uploadChatImage(vars.imageFile)
        queryClient.invalidateQueries({ queryKey: ['chat-daily-images'] })
      }
      if (vars.videoFile) {
        await api.validateVideo(vars.videoFile, 20)
        videoUrl = await api.uploadVideo(vars.videoFile)
        queryClient.invalidateQueries({ queryKey: ['daily-video-count'] })
      }
      return api.sendMessage(id!, vars.content || '​', imageUrl, videoUrl)
    },
    onSuccess: (saved) => setMessages((m) => upsertMessage(m, saved)),
    onError: (err: Error, vars) => {
      setMessages((m) => m.filter((x) => x.id !== vars.tempId))
      setDraft((d) => d || vars.content)
      toast.error(err.message || 'Message failed to send')
    },
  })

  const send = () => {
    const content = draft.trim()
    if (!content && !imageFile && !videoFile) return
    if (!id || !me || !canChat) return
    if (imageFile && !me.is_premium && dailyImageCount >= IMAGE_LIMIT) {
      toast.error(t('chat.send_limit_toast'))
      return
    }
    if (videoFile && dailyVideoCount >= VIDEO_LIMIT) {
      toast.error(t('chat.video_send_limit'))
      return
    }
    const tempId = `temp-${generateId()}`
    setMessages((m) => [...m, {
      id: tempId, link_id: id, sender_id: me.id,
      content: content || '',
      image_url: imageFile ? URL.createObjectURL(imageFile) : null,
      video_url: videoFile ? URL.createObjectURL(videoFile) : null,
      created_at: new Date().toISOString(),
    }])
    setDraft('')
    const imgFile = imageFile
    const vidFile = videoFile
    setImageFile(null)
    setVideoFile(null)
    sendMessage.mutate({ tempId, content, imageFile: imgFile, videoFile: vidFile })
  }

  const pickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!me?.is_premium && dailyImageCount >= IMAGE_LIMIT) {
      toast.error(t('chat.photo_limit_toast'))
      return
    }
    setVideoFile(null)
    setImageFile(file)
    e.target.value = ''
  }

  const pickVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (dailyVideoCount >= VIDEO_LIMIT) {
      toast.error(t('chat.video_limit_toast'))
      e.target.value = ''
      return
    }
    try {
      await api.validateVideo(file, 20)
      setImageFile(null)
      setVideoFile(file)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Invalid video')
    }
    e.target.value = ''
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="glass border-b border-[--border] px-3 h-14 flex items-center gap-3 flex-shrink-0"
      >
        <button onClick={() => navigate('/inbox')} className="btn-ghost -ml-1">
          <ArrowLeft size={20} />
        </button>
        {linkLoading || !partner ? (
          <Skeleton className="h-9 w-40" />
        ) : (
          <>
            <Avatar src={partner.avatar_url} name={partner.full_name} size="sm"
                    isPremium={partner.is_premium} isOnline={partnerOnline} />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sand-900 dark:text-white text-sm truncate">
                {partner.full_name}
              </p>
              <p className={cn('text-[11px]', partnerOnline ? 'text-emerald-500' : 'text-sand-400')}>
                {partnerOnline
                  ? t('chat.active_now')
                  : partner.last_seen
                    ? `${t('chat.active')} ${formatRelativeTime(partner.last_seen)}`
                    : t('chat.offline')}
              </p>
            </div>
          </>
        )}
      </motion.header>

      {/* Context banner — apartment inquiries link back to the listing. */}
      {link?.context_label && (
        link.kind === 'apartment_inquiry' && link.context_id ? (
          <button
            type="button"
            onClick={() => navigate(`/apartments/${link.context_id}`)}
            className="px-4 py-2 bg-primary-50 dark:bg-primary-900/15 text-xs text-primary-700 dark:text-primary-300 text-center flex-shrink-0 hover:bg-primary-100 dark:hover:bg-primary-900/25 transition-colors"
          >
            {t('chat.about')} · <strong>{link.context_label}</strong>
            <span className="ml-1.5 underline font-semibold">{t('chat.view_listing')}</span>
          </button>
        ) : (
          <div className="px-4 py-2 bg-primary-50 dark:bg-primary-900/15 text-xs text-primary-700 dark:text-primary-300 text-center flex-shrink-0">
            {t('chat.about')} · <strong>{link.context_label}</strong>
          </div>
        )
      )}

      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
        {loadingOlder && (
          <p className="text-center text-xs text-sand-400 py-1">{t('chat.loading_earlier')}</p>
        )}
        {msgLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={cn('flex', i % 2 ? 'justify-end' : 'justify-start')}>
                <Skeleton className="h-12 w-48 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-2">
            <span className="text-4xl">👋</span>
            <p className="text-sm font-semibold text-sand-600 dark:text-sand-300">
              {t('chat.start_conversation')}
            </p>
            <p className="text-xs text-sand-400">{t('chat.be_respectful')}</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <Bubble
                key={m.id}
                msg={m}
                mine={m.sender_id === me?.id}
                onImageClick={setLightboxUrl}
              />
            ))}
          </AnimatePresence>
        )}
        {receipt && (
          <p className="pr-1 text-right text-[10px] font-medium text-sand-400">{receipt}</p>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-[--border] p-3 flex-shrink-0 bg-[--bg]">
        {imageFile && (
          <div className="relative w-20 h-20 mb-2">
            <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-full object-cover rounded-xl" />
            <button
              onClick={() => setImageFile(null)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-sand-700 text-white flex items-center justify-center"
            >
              <X size={11} />
            </button>
          </div>
        )}
        {videoFile && (
          <div className="relative mb-2">
            <video src={URL.createObjectURL(videoFile)} className="h-20 rounded-xl bg-black" controls />
            <button
              onClick={() => setVideoFile(null)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-sand-700 text-white flex items-center justify-center"
            >
              <X size={11} />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={pickImage} />
          <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={pickVideo} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!canChat || (!me?.is_premium && dailyImageCount >= IMAGE_LIMIT)}
            title={!me?.is_premium && dailyImageCount >= IMAGE_LIMIT ? t('chat.photo_limit_title') : t('chat.attach_photo')}
            className="h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-sand-100 dark:hover:bg-sand-800 disabled:opacity-40 transition-colors"
          >
            <ImagePlus size={18} className="text-sand-500" />
          </button>
          {me?.is_premium && (
            <button
              onClick={() => videoInputRef.current?.click()}
              disabled={!canChat || dailyVideoCount >= VIDEO_LIMIT}
              title={dailyVideoCount >= VIDEO_LIMIT ? t('chat.video_limit_title') : t('chat.attach_video')}
              className="h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-sand-100 dark:hover:bg-sand-800 disabled:opacity-40 transition-colors"
            >
              <Video size={18} className="text-gold-500" />
            </button>
          )}
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
            }}
            placeholder={canChat
              ? t('chat.placeholder')
              : t('chat.locked')}
            rows={1}
            disabled={!canChat}
            className="flex-1 input-field resize-none max-h-32 py-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={send}
            disabled={(!draft.trim() && !imageFile && !videoFile) || !canChat}
            className="btn-primary h-11 w-11 !px-0 flex-shrink-0 disabled:opacity-50"
          >
            <Send size={18} />
          </motion.button>
        </div>
        {!me?.is_premium && dailyImageCount > 0 && canChat && (
          <p className="mt-1 text-[11px] text-sand-400 text-center">
            {IMAGE_LIMIT - dailyImageCount} {IMAGE_LIMIT - dailyImageCount === 1 ? t('chat.photo_singular') : t('chat.photo_plural')} {t('chat.remaining')}
          </p>
        )}
      </div>
      {lightboxUrl && (
        <Lightbox
          images={[lightboxUrl]}
          index={0}
          onClose={() => setLightboxUrl(null)}
        />
      )}
    </div>
  )
}
