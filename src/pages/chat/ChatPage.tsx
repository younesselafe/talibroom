import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Send, Phone, MoreVertical } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import type { Message } from '@/types'
import Avatar from '@/components/shared/Avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatRelativeTime, generateId } from '@/lib/utils'

function Bubble({ msg, mine }: { msg: Message; mine: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={cn('flex', mine ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
          mine
            ? 'bg-primary-500 text-white rounded-br-md'
            : 'bg-white dark:bg-[#1C1C1A] text-sand-800 dark:text-sand-200 rounded-bl-md border border-sand-100 dark:border-[#2A2A26]'
        )}
      >
        <p className="whitespace-pre-line">{msg.content}</p>
        <p className={cn('text-[10px] mt-1', mine ? 'text-white/60' : 'text-sand-400')}>
          {formatRelativeTime(msg.created_at)}
        </p>
      </div>
    </motion.div>
  )
}

export default function ChatPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const me = useAuthStore((s) => s.profile)
  const scrollRef = useRef<HTMLDivElement>(null)

  const { data: link, isLoading: linkLoading } = useQuery({
    queryKey: ['link', id], queryFn: () => api.getLink(id!), enabled: !!id,
  })
  const { data: initialMessages, isLoading: msgLoading } = useQuery({
    queryKey: ['messages', id], queryFn: () => api.getMessages(id!), enabled: !!id,
  })

  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')

  useEffect(() => { if (initialMessages) setMessages(initialMessages) }, [initialMessages])
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const partner = link ? (link.sender_id === me?.id ? link.receiver : link.sender) : undefined

  const send = () => {
    if (!draft.trim() || !id || !me) return
    setMessages((m) => [...m, {
      id: generateId(), link_id: id, sender_id: me.id,
      content: draft.trim(), created_at: new Date().toISOString(),
    }])
    setDraft('')
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
                    isPremium={partner.is_premium} isOnline />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sand-900 dark:text-white text-sm truncate">
                {partner.full_name}
              </p>
              <p className="text-[11px] text-emerald-500">Active now</p>
            </div>
            <button className="btn-ghost"><Phone size={18} /></button>
            <button className="btn-ghost"><MoreVertical size={18} /></button>
          </>
        )}
      </motion.header>

      {/* Context banner */}
      {link?.context_label && (
        <div className="px-4 py-2 bg-primary-50 dark:bg-primary-900/15 text-xs text-primary-700 dark:text-primary-300 text-center flex-shrink-0">
          Conversation about · <strong>{link.context_label}</strong>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
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
              Start the conversation
            </p>
            <p className="text-xs text-sand-400">Be respectful — you're both students.</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((m) => <Bubble key={m.id} msg={m} mine={m.sender_id === me?.id} />)}
          </AnimatePresence>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-[--border] p-3 flex items-end gap-2 flex-shrink-0 bg-[--bg]">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
          }}
          placeholder="Type a message…"
          rows={1}
          className="flex-1 input-field resize-none max-h-32 py-2.5"
        />
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={send}
          disabled={!draft.trim()}
          className="btn-primary h-11 w-11 !px-0 flex-shrink-0"
        >
          <Send size={18} />
        </motion.button>
      </div>
    </div>
  )
}
