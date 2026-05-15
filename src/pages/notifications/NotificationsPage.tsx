import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Heart, MessageSquare, UserPlus, Home, MessageCircle, Bell, CheckCheck, UsersRound,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useUIStore } from '@/store/uiStore'
import type { Notification, NotificationType } from '@/types'
import Avatar from '@/components/shared/Avatar'
import EmptyState from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { cn, formatRelativeTime } from '@/lib/utils'
import { staggerContainer, staggerItem } from '@/components/ui/motion'

const ICON: Record<NotificationType, { icon: typeof Bell; color: string }> = {
  link_request:     { icon: UserPlus,      color: 'bg-primary-500' },
  link_accepted:    { icon: UserPlus,      color: 'bg-emerald-500' },
  new_message:      { icon: MessageSquare, color: 'bg-blue-500' },
  post_like:        { icon: Heart,         color: 'bg-rose-500' },
  post_comment:     { icon: MessageCircle, color: 'bg-violet-500' },
  apartment_inquiry:{ icon: Home,          color: 'bg-amber-500' },
  group_invite:     { icon: UsersRound,    color: 'bg-teal-500' },
  group_joined:     { icon: UsersRound,    color: 'bg-teal-500' },
  system:           { icon: Bell,          color: 'bg-sand-500' },
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const setUnread = useUIStore((s) => s.setUnreadNotifications)
  const { data, isLoading } = useQuery({ queryKey: ['notifications'], queryFn: api.getNotifications })
  const [items, setItems] = useState<Notification[] | null>(null)

  const list = items ?? data ?? []
  const unread = list.filter((n) => !n.is_read).length

  const markAll = () => {
    setItems(list.map((n) => ({ ...n, is_read: true })))
    setUnread(0)
  }

  const openNotification = (n: Notification) => {
    setItems((cur) => (cur ?? data ?? []).map((x) => x.id === n.id ? { ...x, is_read: true } : x))
    if (n.link_id) navigate(`/chat/${n.link_id}`)
    else if (n.apartment_id) navigate(`/apartments/${n.apartment_id}`)
    else if (n.post_id) navigate('/community')
  }

  return (
    <div className="page-container max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="mb-5 flex items-end justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-sand-900 dark:text-white tracking-tight">
            Notifications
          </h1>
          <p className="text-sand-500 dark:text-sand-400 mt-1">
            {unread > 0 ? `${unread} new update${unread > 1 ? 's' : ''}` : 'You\'re all caught up'}
          </p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={markAll}>
            <CheckCheck size={15} /> Mark all read
          </Button>
        )}
      </motion.div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-18 w-full" />)}
        </div>
      ) : list.length === 0 ? (
        <EmptyState icon="🔔" title="No notifications yet" description="Activity on your profile and listings shows up here." />
      ) : (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2">
          {list.map((n) => {
            const { icon: Icon, color } = ICON[n.type] ?? ICON.system
            return (
              <motion.button
                key={n.id}
                variants={staggerItem}
                whileHover={{ x: 4 }}
                onClick={() => openNotification(n)}
                className={cn(
                  'w-full text-left card p-4 flex items-center gap-3 transition-colors',
                  !n.is_read && 'bg-primary-50/60 dark:bg-primary-900/10 border-primary-100 dark:border-primary-900/30'
                )}
              >
                <div className="relative flex-shrink-0">
                  {n.actor ? (
                    <Avatar src={n.actor.avatar_url} name={n.actor.full_name} size="md" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-sand-100 dark:bg-[#2A2A26] flex items-center justify-center">
                      <Bell size={16} className="text-sand-400" />
                    </div>
                  )}
                  <span className={cn('absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center', color)}>
                    <Icon size={11} className="text-white" />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-sand-700 dark:text-sand-200 leading-snug">{n.preview}</p>
                  <p className="text-xs text-sand-400 mt-0.5">{formatRelativeTime(n.created_at)}</p>
                </div>
                {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />}
              </motion.button>
            )
          })}
        </motion.div>
      )}
    </div>
  )
}
