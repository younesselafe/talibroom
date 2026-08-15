import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { MessageSquare, Home, ShoppingBag, Heart, ChevronRight, Users } from 'lucide-react'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Link as LinkType } from '@/types'
import Avatar from '@/components/shared/Avatar'
import EmptyState from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { formatRelativeTime } from '@/lib/utils'
import { staggerContainer, staggerItem } from '@/components/ui/motion'
import { useLanguage } from '@/lib/LanguageContext'

const KIND_ICON = {
  roommate: Heart,
  direct: MessageSquare,
  apartment_inquiry: Home,
  marketplace: ShoppingBag,
}

export default function InboxPage() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const me = useAuthStore((s) => s.profile)
  const [tab, setTab] = useState<'chats' | 'groups' | 'inquiries'>('chats')
  const queryClient = useQueryClient()

  const { data: links, isLoading } = useQuery({ queryKey: ['links'], queryFn: api.getLinks })
  const { data: groups } = useQuery({ queryKey: ['groups'], queryFn: api.getGroups })

  // Live updates — refresh when a link the user is part of changes.
  useEffect(() => {
    if (!me?.id) return
    const channel = supabase
      .channel(`links:${me.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'links' },
        () => queryClient.invalidateQueries({ queryKey: ['links'] }),
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [me?.id, queryClient])

  const other = (l: LinkType) => (l.sender_id === me?.id ? l.receiver : l.sender)

  const { chats, inquiries } = useMemo(() => {
    const all = links ?? []
    return {
      chats: all.filter((l) => l.status === 'accepted' && (l.kind === 'roommate' || l.kind === 'direct')),
      inquiries: all.filter((l) => l.kind === 'apartment_inquiry' || l.kind === 'marketplace'),
    }
  }, [links])

  // Group chats — groups the user is an accepted member of.
  const myGroups = useMemo(() => (groups ?? []).filter((g) => g.is_member), [groups])

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
        <h1 className="text-2xl sm:text-3xl font-black text-sand-900 dark:text-white tracking-tight">{t('inboxTitle')}</h1>
        <p className="text-sand-500 dark:text-sand-400 mt-1">{t('inboxSubtitle')}</p>
      </motion.div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="w-full">
          <TabsTrigger value="chats" className="flex-1">{t('chats')}</TabsTrigger>
          <TabsTrigger value="groups" className="flex-1">
            {t('inbox.groups_tab')} {myGroups.length > 0 && <Badge variant="default" className="ml-1">{myGroups.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="inquiries" className="flex-1">{t('inquiries')}</TabsTrigger>
        </TabsList>

        {/* CHATS */}
        <TabsContent value="chats">
          {chats.length === 0 ? (
            <EmptyState icon="💬" title={t('noConversations')} description={t('noConversationsDesc')} />
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
                        {l.last_message?.content ?? t('sayHello')}
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

        {/* GROUPS */}
        <TabsContent value="groups">
          {myGroups.length === 0 ? (
            <EmptyState icon="👥" title={t('noGroupChats')} description={t('noGroupChatsDesc')} />
          ) : (
            <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2">
              {myGroups.map((g) => (
                <motion.button
                  key={g.id}
                  variants={staggerItem}
                  whileHover={{ x: 4 }}
                  onClick={() => navigate(`/groups/${g.id}`)}
                  className="card p-4 flex items-center gap-3 w-full text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                    <Users size={18} className="text-primary-600 dark:text-primary-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sand-900 dark:text-white text-sm truncate">{g.name}</p>
                    <p className="text-xs text-sand-400 truncate">
                      {g.member_count ?? 0} {(g.member_count ?? 0) === 1 ? t('member') : t('memberPlural')} · {g.city}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-sand-300" />
                </motion.button>
              ))}
            </motion.div>
          )}
        </TabsContent>

        {/* INQUIRIES */}
        <TabsContent value="inquiries">
          {inquiries.length === 0 ? (
            <EmptyState icon="🏠" title={t('noInquiries')} description={t('noInquiriesDesc')} />
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
                        {l.context_label ?? (l.kind === 'apartment_inquiry' ? t('apartmentInquiry') : t('marketplaceItem'))}
                      </p>
                    </div>
                    {/* Listing threads open pre-accepted — only flag the odd one out. */}
                    {l.status !== 'accepted' && <Badge variant="neutral">{l.status}</Badge>}
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
