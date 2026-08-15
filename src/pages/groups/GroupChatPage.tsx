import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Send, Users, ImagePlus, Video, X } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Message, Profile } from '@/types'
import Avatar from '@/components/shared/Avatar'
import EmptyState from '@/components/shared/EmptyState'
import Lightbox from '@/components/shared/Lightbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { cn, formatRelativeTime, generateId } from '@/lib/utils'
import { useLanguage } from '@/lib/LanguageContext'

/** Merge an incoming message, de-duping realtime echoes and optimistic temps. */
function upsertMessage(list: Message[], incoming: Message): Message[] {
  if (list.some((m) => m.id === incoming.id)) return list
  const tempIdx = list.findIndex(
    (m) => m.id.startsWith('temp-')
      && m.sender_id === incoming.sender_id
      && (
        m.content === incoming.content
        || (m.image_url?.startsWith('blob:') && !!incoming.image_url)
        || (m.video_url?.startsWith('blob:') && !!incoming.video_url)
      ),
  )
  if (tempIdx === -1) return [...list, incoming]
  const next = list.slice()
  next[tempIdx] = incoming
  return next
}

export default function GroupChatPage() {
  const { t } = useLanguage()
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const me = useAuthStore((s) => s.profile)
  const scrollRef = useRef<HTMLDivElement>(null)
  const manageRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ['group', id], queryFn: () => api.getGroup(id!), enabled: !!id,
    refetchOnMount: 'always',
  })

  // Fallback: fetch owner profile if getGroup didn't embed it.
  const { data: ownerProfile } = useQuery({
    queryKey: ['profile', group?.owner_id],
    queryFn: () => api.getProfile(group!.owner_id),
    enabled: !!group?.owner_id && !group?.owner,
  })
  const { data: initialMessages, isLoading: msgLoading } = useQuery({
    queryKey: ['group-messages', id], queryFn: () => api.getGroupMessages(id!), enabled: !!id,
    refetchOnMount: 'always',
  })

  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [hasMore, setHasMore] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const lastIdRef = useRef<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  // Seed from the latest page; a short first page means there's nothing older.
  useEffect(() => {
    if (initialMessages) {
      setMessages(initialMessages)
      setHasMore(initialMessages.length >= 30)
    }
  }, [initialMessages])

  // Auto-scroll to the bottom only for newly-arrived messages, never on prepend.
  useEffect(() => {
    const lastId = messages[messages.length - 1]?.id ?? null
    if (lastId && lastId !== lastIdRef.current) {
      lastIdRef.current = lastId
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [messages])

  // Load the previous page near the top, preserving scroll position.
  const loadOlder = async () => {
    if (loadingOlder || !hasMore || !id || messages.length === 0) return
    setLoadingOlder(true)
    const el = scrollRef.current
    const prevHeight = el?.scrollHeight ?? 0
    try {
      const older = await api.getGroupMessages(id, messages[0].created_at)
      if (older.length < 30) setHasMore(false)
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

  // Live group thread — RLS scopes the stream to groups the user belongs to.
  useEffect(() => {
    if (!id) return
    const channel = supabase
      .channel(`group-messages:${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${id}` },
        (payload) => setMessages((m) => upsertMessage(m, payload.new as Message)),
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id])

  // Group messages come from many people — resolve each sender's profile.
  const senderById = useMemo(() => {
    const map = new Map<string, Profile>()
    for (const m of group?.members ?? []) {
      if (m.profile) map.set(m.user_id, m.profile)
    }
    return map
  }, [group])

  // The group owner's profile — shown to every member so they know who runs
  // the group (and can open their profile).
  const owner = group?.owner ?? ownerProfile ?? (group ? senderById.get(group.owner_id) : undefined)

  // If opened from a join-request notification, scroll the manage panel into view.
  useEffect(() => {
    if (searchParams.get('manage') === 'true' && manageRef.current) {
      setTimeout(() => manageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 400)
    }
  }, [searchParams, group])

  const isMember = group?.is_member ?? false
  const isOwner = !!group && !!me && group.owner_id === me.id

  const IMAGE_LIMIT = me?.is_premium ? Infinity : 3
  const VIDEO_LIMIT = me?.is_premium ? 5 : 0

  const { data: dailyImageCount = 0 } = useQuery({
    queryKey: ['chat-daily-images'],
    queryFn: api.getDailyChatImageCount,
    enabled: isMember && !me?.is_premium,
  })
  const { data: dailyVideoCount = 0 } = useQuery({
    queryKey: ['daily-video-count'],
    queryFn: api.getDailyVideoCount,
    enabled: isMember && !!me?.is_premium,
  })
  const pendingRequests = (group?.members ?? []).filter((m) => m.status === 'pending')
  const acceptedMembers = (group?.members ?? []).filter((m) => m.status === 'accepted')
  const full = !!group && acceptedMembers.length >= group.max_size

  // Owner approves / declines join requests.
  const respond = useMutation({
    mutationFn: (v: { id: string; status: 'accepted' | 'declined' }) =>
      api.updateGroupMember(v.id, v.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', id] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
    onError: (e: Error) => toast.error(e.message || 'Could not update the request'),
  })

  // Owner removes a member (or a pending request) from the group.
  const kick = useMutation({
    mutationFn: (memberId: string) => api.removeGroupMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', id] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
    onError: (e: Error) => toast.error(e.message || 'Could not remove the member'),
  })

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
      return api.sendGroupMessage(id!, vars.content || '​', imageUrl, videoUrl)
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
    if (!id || !me || !isMember) return
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
      id: tempId, link_id: null, group_id: id, sender_id: me.id,
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

  const pickGroupImage = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const pickGroupVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  if (!groupLoading && !group) {
    return (
      <div className="page-container">
        <EmptyState icon="👥" title={t('groups.chat.not_found')}
          action={<Button onClick={() => navigate('/groups')}>{t('groups.chat.back')}</Button>} />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="glass border-b border-[--border] px-3 h-14 flex items-center gap-3 flex-shrink-0"
      >
        <button onClick={() => navigate('/groups')} className="btn-ghost -ml-1">
          <ArrowLeft size={20} />
        </button>
        {groupLoading || !group ? (
          <Skeleton className="h-9 w-40" />
        ) : (
          <>
            <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
              <Users size={17} className="text-primary-600 dark:text-primary-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sand-900 dark:text-white text-sm truncate">
                {group.name}
              </p>
              <p className="text-[11px] text-sand-400">
                {group.member_count ?? 0} member{(group.member_count ?? 0) === 1 ? '' : 's'} · {group.city}
              </p>
            </div>
          </>
        )}
      </motion.header>

      {/* Group owner — visible to every member */}
      {owner && (
        <button
          onClick={() => navigate(`/profile/${owner.id}`)}
          className="flex-shrink-0 flex items-center gap-2.5 border-b border-[--border] px-4 py-2 text-left hover:bg-sand-50 dark:hover:bg-[#16201E]"
        >
          <Avatar src={owner.avatar_url} name={owner.full_name} size="sm" isPremium={owner.is_premium} />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-sand-500 dark:text-sand-400">{t('groups.chat.group_owner')}</p>
            <p className="truncate text-sm font-bold text-sand-900 dark:text-white">
              {owner.full_name}
              {owner.gender && (
                <span className="ml-1.5 text-xs font-medium text-sand-400">
                  · {owner.gender === 'female' ? t('woman') : t('man')}
                </span>
              )}
            </p>
          </div>
        </button>
      )}

      {/* Owner — manage join requests & members */}
      {isOwner && group && (
        <div ref={manageRef} className="flex-shrink-0 max-h-56 overflow-y-auto border-b border-[--border] bg-sand-50 dark:bg-[#16201E]">
          {pendingRequests.length > 0 && (
            <>
              <p className="px-4 pt-3 text-xs font-bold text-sand-700 dark:text-sand-300">
                {t('groups.chat.join_requests')} · {pendingRequests.length}
              </p>
              {pendingRequests.map((m) => (
                <div key={m.id} className="flex items-center gap-2 px-4 py-2">
                  <button
                    onClick={() => navigate(`/profile/${m.user_id}`)}
                    className="flex min-w-0 flex-1 items-center gap-2 hover:opacity-80"
                  >
                    <Avatar src={m.profile?.avatar_url} name={m.profile?.full_name ?? '?'} size="sm" />
                    <span className="truncate text-sm font-medium text-sand-800 dark:text-sand-200">
                      {m.profile?.full_name ?? 'Student'}
                    </span>
                  </button>
                  <Button size="sm" disabled={respond.isPending || full}
                          onClick={() => respond.mutate({ id: m.id, status: 'accepted' })}>
                    {t('groups.chat.approve')}
                  </Button>
                  <Button size="sm" variant="outline" disabled={respond.isPending}
                          onClick={() => respond.mutate({ id: m.id, status: 'declined' })}>
                    {t('groups.chat.decline')}
                  </Button>
                </div>
              ))}
              {full && (
                <p className="px-4 pb-1 text-[11px] font-medium text-gold-600">
                  {t('groups.chat.full_warning')}
                </p>
              )}
            </>
          )}

          <p className="px-4 pt-3 text-xs font-bold text-sand-700 dark:text-sand-300">
            {t('groups.chat.members')} · {acceptedMembers.length}/{group.max_size}
          </p>
          {acceptedMembers.map((m) => (
            <div key={m.id} className="flex items-center gap-2 px-4 py-2">
              <button
                onClick={() => navigate(`/profile/${m.user_id}`)}
                className="flex min-w-0 flex-1 items-center gap-2 hover:opacity-80"
              >
                <Avatar src={m.profile?.avatar_url} name={m.profile?.full_name ?? '?'} size="sm" />
                <span className="truncate text-sm font-medium text-sand-800 dark:text-sand-200">
                  {m.profile?.full_name ?? 'Student'}
                  {m.user_id === group.owner_id && (
                    <span className="ml-1 text-[11px] font-bold text-gold-600">· {t('groups.chat.role_owner')}</span>
                  )}
                </span>
              </button>
              {m.user_id !== group.owner_id && (
                <Button size="sm" variant="outline" disabled={kick.isPending}
                        onClick={() => kick.mutate(m.id)}>
                  {t('remove')}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
        {loadingOlder && (
          <p className="text-center text-xs text-sand-400 py-1">{t('groups.chat.loading_earlier')}</p>
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
              {t('groups.chat.say_hello')}
            </p>
            <p className="text-xs text-sand-400">{t('groups.chat.plan')}</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((m) => {
              const mine = m.sender_id === me?.id
              const sender = senderById.get(m.sender_id) ?? m.sender
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className={cn('flex items-end gap-2', mine ? 'justify-end' : 'justify-start')}
                >
                  {!mine && (
                    <button
                      onClick={() => navigate(`/profile/${m.sender_id}`)}
                      className="hover:opacity-80"
                      aria-label={`View ${sender?.full_name ?? 'profile'}`}
                    >
                      <Avatar src={sender?.avatar_url} name={sender?.full_name ?? '?'} size="sm" />
                    </button>
                  )}
                  <div
                    className={cn(
                      'max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
                      mine
                        ? 'bg-primary-500 text-white rounded-br-md'
                        : 'bg-white dark:bg-[#16201E] text-sand-800 dark:text-sand-200 rounded-bl-md border border-sand-100 dark:border-[#27302E]',
                    )}
                  >
                    {!mine && (
                      <button
                        onClick={() => navigate(`/profile/${m.sender_id}`)}
                        className="text-[11px] font-bold text-primary-500 mb-0.5 hover:underline"
                      >
                        {sender?.full_name ?? 'Student'}
                      </button>
                    )}
                    {m.image_url && (
                      <button
                        type="button"
                        onClick={() => setLightboxUrl(m.image_url!)}
                        className="block mb-1"
                        aria-label="View photo fullscreen"
                      >
                        <img
                          src={m.image_url}
                          alt="photo"
                          className="rounded-lg max-w-[220px] max-h-[200px] object-cover hover:opacity-90 transition"
                        />
                      </button>
                    )}
                    {m.video_url && (
                      <video
                        src={m.video_url}
                        controls
                        playsInline
                        className="rounded-lg max-w-[220px] max-h-[200px] bg-black mb-1"
                      />
                    )}
                    {m.content.trim() && m.content !== '​' && (
                      <p className="whitespace-pre-line">{m.content}</p>
                    )}
                    <p className={cn('text-[10px] mt-1', mine ? 'text-white/60' : 'text-sand-400')}>
                      {formatRelativeTime(m.created_at)}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-[--border] flex-shrink-0 bg-[--bg]">
        {imageFile && (
          <div className="px-3 pt-2 flex items-start gap-2">
            <div className="relative inline-block">
              <img
                src={URL.createObjectURL(imageFile)}
                alt="pending"
                className="h-20 w-20 rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => setImageFile(null)}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-sand-800/80 text-white flex items-center justify-center hover:bg-black"
              >
                <X size={11} />
              </button>
            </div>
          </div>
        )}
        {videoFile && (
          <div className="px-3 pt-2">
            <div className="relative inline-block">
              <video src={URL.createObjectURL(videoFile)} className="h-20 rounded-lg bg-black" controls />
              <button
                type="button"
                onClick={() => setVideoFile(null)}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-sand-800/80 text-white flex items-center justify-center hover:bg-black"
              >
                <X size={11} />
              </button>
            </div>
          </div>
        )}
        <div className="p-3 flex items-end gap-2">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={pickGroupImage}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={pickGroupVideo}
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={!isMember || (!me?.is_premium && dailyImageCount >= IMAGE_LIMIT)}
            title={!me?.is_premium && dailyImageCount >= IMAGE_LIMIT ? t('groups.chat.photo_limit') : t('groups.chat.add_photo')}
            className="h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-xl border border-[--border] text-sand-500 hover:text-primary-500 hover:border-primary-300 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ImagePlus size={18} />
          </button>
          {me?.is_premium && (
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={!isMember || dailyVideoCount >= VIDEO_LIMIT}
              title={dailyVideoCount >= VIDEO_LIMIT ? t('groups.chat.video_limit') : t('groups.chat.add_video')}
              className="h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-xl border border-[--border] text-gold-500 hover:text-gold-600 hover:border-gold-300 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Video size={18} />
            </button>
          )}
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
            }}
            placeholder={isMember ? t('groups.chat.placeholder') : t('groups.chat.locked')}
            rows={1}
            disabled={!isMember}
            className="flex-1 input-field resize-none max-h-32 py-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={send}
            disabled={(!draft.trim() && !imageFile && !videoFile) || !isMember || sendMessage.isPending}
            className="btn-primary h-11 w-11 !px-0 flex-shrink-0 disabled:opacity-50"
          >
            <Send size={18} />
          </motion.button>
        </div>
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
