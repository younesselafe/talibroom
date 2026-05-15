import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check, X, MessageSquare, Home, ShoppingBag, Heart, ChevronRight,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import type { Link as LinkType } from '@/types'
import Avatar from '@/components/shared/Avatar'
import EmptyState from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { formatRelativeTime } from '@/lib/utils'
import { staggerContainer, staggerItem } from '@/components/ui/motion'
import { toast } from 'sonner'

const KIND_ICON = {
  roommate: Heart,
  direct: MessageSquare,
  apartment_inquiry: Home,
  marketplace: ShoppingBag,
}

export default function InboxPage() {
  const navigate = useNavigate()
  const me = useAuthStore((s) => s.profile)
  const [tab, setTab] = useState<'requests' | 'chats' | 'inquiries'>('requests')
  const [handled, setHandled] = useState<Record<string, 'accepted' | 'declined'>>({})

  const { data: links, isLoading } = useQuery({ queryKey: ['links'], queryFn: api.getLinks })

  const other = (l: LinkType) => (l.sender_id === me?.id ? l.receiver : l.sender)

  const { requests, chats, inquiries } = useMemo(() => {
    const all = links ?? []
    return {
      requests: all.filter((l) => l.status === 'pending' && l.receiver_id === me?.id
        && (l.kind === 'roommate' || l.kind === 'direct')),
      chats: all.filter((l) => l.status === 'accepted' && (l.kind === 'roommate' || l.kind === 'direct')),
      inquiries: all.filter((l) => l.kind === 'apartment_inquiry' || l.kind === 'marketplace'),
    }
  }, [links, me?.id])

  const respond = (id: string, action: 'accepted' | 'declined') => {
    setHandled((h) => ({ ...h, [id]: action }))
    toast[action === 'accepted' ? 'success' : 'message'](
      action === 'accepted' ? 'Connected! You can now chat.' : 'Request declined'
    )
  }

  if (isLoading) {
    return (
      <div className="page-container max-w-2xl space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    )
  }

  return (
    <div className="page-container max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <h1 className="text-2xl sm:text-3xl font-black text-sand-900 dark:text-white tracking-tight">Inbox</h1>
        <p className="text-sand-500 dark:text-sand-400 mt-1">Requests, conversations and listing inquiries.</p>
      </motion.div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="w-full">
          <TabsTrigger value="requests" className="flex-1">
            Requests {requests.length > 0 && <Badge variant="default" className="ml-1">{requests.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="chats" className="flex-1">Chats</TabsTrigger>
          <TabsTrigger value="inquiries" className="flex-1">Inquiries</TabsTrigger>
        </TabsList>

        {/* REQUESTS */}
        <TabsContent value="requests">
          {requests.length === 0 ? (
            <EmptyState icon="🤝" title="No pending requests" description="New Link Up requests will land here." />
          ) : (
            <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
              <AnimatePresence>
                {requests.map((l) => {
                  const p = other(l)
                  const status = handled[l.id]
                  return (
                    <motion.div
                      key={l.id}
                      variants={staggerItem}
                      exit={{ opacity: 0, x: -40 }}
                      layout
                      className="card p-4 flex items-center gap-3"
                    >
                      <Avatar src={p?.avatar_url} name={p?.full_name ?? '?'} size="md" isPremium={p?.is_premium} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sand-900 dark:text-white text-sm">{p?.full_name}</p>
                        <p className="text-xs text-sand-400">
                          {l.kind === 'roommate' ? 'Wants to be roommates' : 'Wants to connect'} · {formatRelativeTime(l.created_at)}
                        </p>
                      </div>
                      {status ? (
                        <Badge variant={status === 'accepted' ? 'green' : 'neutral'}>{status}</Badge>
                      ) : (
                        <div className="flex gap-2">
                          <motion.div whileTap={{ scale: 0.9 }}>
                            <Button size="icon" variant="secondary" onClick={() => respond(l.id, 'declined')}>
                              <X size={16} />
                            </Button>
                          </motion.div>
                          <motion.div whileTap={{ scale: 0.9 }}>
                            <Button size="icon" onClick={() => respond(l.id, 'accepted')}>
                              <Check size={16} />
                            </Button>
                          </motion.div>
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </TabsContent>

        {/* CHATS */}
        <TabsContent value="chats">
          {chats.length === 0 ? (
            <EmptyState icon="💬" title="No conversations yet" description="Accepted connections show up here." />
          ) : (
            <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2">
              {chats.map((l) => {
                const p = other(l)
                return (
                  <motion.button
                    key={l.id}
                    variants={staggerItem}
                    whileHover={{ x: 4 }}
                    onClick={() => navigate(`/chat/${l.id}`)}
                    className="card p-4 flex items-center gap-3 w-full text-left"
                  >
                    <Avatar src={p?.avatar_url} name={p?.full_name ?? '?'} size="md" isPremium={p?.is_premium} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-sand-900 dark:text-white text-sm truncate">{p?.full_name}</p>
                        {l.last_message && (
                          <span className="text-[11px] text-sand-400 flex-shrink-0">
                            {formatRelativeTime(l.last_message.created_at)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-sand-400 truncate">
                        {l.last_message?.content ?? 'Say hello 👋'}
                      </p>
                    </div>
                    {(l.unread_count ?? 0) > 0 && (
                      <span className="w-5 h-5 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {l.unread_count}
                      </span>
                    )}
                  </motion.button>
                )
              })}
            </motion.div>
          )}
        </TabsContent>

        {/* INQUIRIES */}
        <TabsContent value="inquiries">
          {inquiries.length === 0 ? (
            <EmptyState icon="🏠" title="No inquiries" description="Questions about your listings appear here." />
          ) : (
            <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2">
              {inquiries.map((l) => {
                const p = other(l)
                const Icon = KIND_ICON[l.kind] ?? MessageSquare
                return (
                  <motion.button
                    key={l.id}
                    variants={staggerItem}
                    whileHover={{ x: 4 }}
                    onClick={() => navigate(`/chat/${l.id}`)}
                    className="card p-4 flex items-center gap-3 w-full text-left"
                  >
                    <div className="relative">
                      <Avatar src={p?.avatar_url} name={p?.full_name ?? '?'} size="md" />
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                        <Icon size={11} className="text-white" />
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sand-900 dark:text-white text-sm truncate">{p?.full_name}</p>
                      <p className="text-xs text-sand-400 truncate">
                        {l.context_label ?? (l.kind === 'apartment_inquiry' ? 'Apartment inquiry' : 'Marketplace item')}
                      </p>
                    </div>
                    <Badge variant={l.status === 'pending' ? 'neutral' : 'green'}>{l.status}</Badge>
                    <ChevronRight size={16} className="text-sand-300" />
                  </motion.button>
                )
              })}
            </motion.div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
