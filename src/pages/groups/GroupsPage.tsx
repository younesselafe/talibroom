import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, MapPin, Users, X, Crown, Loader2, MessageSquare } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { MOROCCAN_CITIES } from '@/types'
import type { Group, GroupStatus } from '@/types'
import Avatar from '@/components/shared/Avatar'
import EmptyState from '@/components/shared/EmptyState'
import SkeletonGrid from '@/components/shared/SkeletonCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { staggerContainer, staggerItem } from '@/components/ui/motion'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/LanguageContext'

function GroupCard({ group }: { group: Group }) {
  const { t } = useLanguage()
  const me = useAuthStore((s) => s.profile)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const STATUS_BADGE: Record<GroupStatus, { label: string; variant: 'green' | 'neutral' | 'gold' }> = {
    open:    { label: t('groups.open'),    variant: 'green' },
    closed:  { label: t('groups.closed'), variant: 'neutral' },
    matched: { label: t('groups.matched'), variant: 'gold' },
  }
  const GENDER_LABEL: Record<string, string> = {
    male: t('groups.men_only'), female: t('groups.women_only'), mixed: t('groups.mixed'),
  }
  const { label, variant } = STATUS_BADGE[group.status]
  const members = group.members ?? []
  const count = group.member_count ?? members.length
  const full = count >= group.max_size
  const mine = group.owner_id === me?.id
  const isMember = mine || !!group.is_member
  const isPending = !!group.is_pending
  // Requests are always allowed — a full group still queues join requests
  // for the owner to manage; `full` only labels the card.

  // Joining sends a request — the owner approves it before you can chat.
  const join = useMutation({
    mutationFn: () => api.joinGroup(group.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      toast.success(`Join request sent to "${group.name}" 🤝`)
    },
    onError: (e: Error) => toast.error(e.message || 'Could not send your request'),
  })

  return (
    <motion.div variants={staggerItem} whileHover={{ y: -4 }} className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold text-sand-900 dark:text-white leading-tight">{group.name}</h3>
          <p className="text-xs text-sand-400 flex items-center gap-1 mt-1">
            <MapPin size={12} /> {group.city}
          </p>
        </div>
        <Badge variant={variant}>{label}</Badge>
      </div>

      {group.description && (
        <p className="text-sm text-sand-600 dark:text-sand-300 mt-3 line-clamp-2">{group.description}</p>
      )}

      {/* Members */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {members.slice(0, 4).map((m) => (
              <Avatar key={m.id} src={m.profile?.avatar_url} name={m.profile?.full_name ?? '?'}
                      size="sm" className="ring-2 ring-white dark:ring-[#16201E]" />
            ))}
            {members.length === 0 && (
              <div className="w-8 h-8 rounded-full bg-sand-100 dark:bg-[#222D2B] flex items-center justify-center">
                <Users size={13} className="text-sand-400" />
              </div>
            )}
          </div>
          <span className="text-xs font-semibold text-sand-500">
            {count}/{group.max_size} {t('memberPlural')}{full ? ` · ${t('groups.full')}` : ''}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-sand-100 dark:border-[#222D2B]">
        <button
          onClick={(e) => { e.stopPropagation(); if (group.owner) navigate(`/profile/${group.owner.id}`) }}
          className="flex items-center gap-1.5 text-xs text-sand-400 hover:text-primary-500 transition-colors"
          aria-label={`View ${group.owner?.full_name ?? 'owner'} profile`}
        >
          <Crown size={13} className="text-gold-500" />
          {group.owner?.full_name?.split(' ')[0] ?? 'Owner'}
        </button>
        {group.gender && group.gender !== 'mixed' && (
          <span className="rounded-full bg-sand-100 dark:bg-[#222D2B] px-2 py-0.5 text-[10px] font-semibold text-sand-500 dark:text-sand-400">
            {GENDER_LABEL[group.gender]}
          </span>
        )}
        <motion.div whileTap={{ scale: 0.96 }} className="ml-auto">
          {isMember ? (
            <Button size="sm" onClick={() => navigate(`/groups/${group.id}`)}>
              <MessageSquare size={14} /> {t('groups.open_chat')}
            </Button>
          ) : isPending ? (
            <Button size="sm" variant="secondary" disabled>{t('groups.requested')}</Button>
          ) : (
            <Button size="sm" disabled={join.isPending} onClick={() => join.mutate()}>
              {join.isPending
                ? <Loader2 size={14} className="animate-spin" />
                : t('groups.request_join')}
            </Button>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}

export default function GroupsPage() {
  const { t } = useLanguage()
  const me = useAuthStore((s) => s.profile)
  const queryClient = useQueryClient()
  const { data: groups, isLoading } = useQuery({ queryKey: ['groups'], queryFn: api.getGroups })

  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    name: '', city: me?.city ?? '', maxSize: 4, description: '',
    gender: (me?.gender ?? 'mixed') as 'male' | 'female' | 'mixed',
  })

  // Gender filter — locked to user's own gender; shows groups of matching gender + mixed.
  const genderFilter = (me?.gender ?? 'all') as 'male' | 'female' | 'mixed' | 'all'
  const [cityFilter, setCityFilter] = useState<string>('all')

  const filteredGroups = useMemo(
    () => (groups ?? []).filter((g) => {
      if (cityFilter !== 'all' && g.city !== cityFilter) return false
      if (genderFilter !== 'all' && g.gender !== genderFilter && g.gender !== 'mixed') return false
      return true
    }),
    [groups, genderFilter, cityFilter],
  )

  // Daily group creation limit — 3 for free users, 10 for premium.
  const GROUP_LIMIT = me?.is_premium ? 10 : 3
  const { data: dailyGroupCount = 0 } = useQuery({
    queryKey: ['daily-group-count'],
    queryFn: api.getDailyGroupCount,
    enabled: creating,
  })
  const atGroupLimit = dailyGroupCount >= GROUP_LIMIT

  // Create the group for real — the `handle_new_group` trigger adds the owner
  // as the first (accepted) member automatically.
  const create = useMutation({
    mutationFn: () => api.createGroup({
      name: form.name.trim(),
      city: form.city,
      max_size: form.maxSize,
      description: form.description.trim(),
      gender: form.gender,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['daily-group-count'] })
      setCreating(false)
      setForm({ name: '', city: me?.city ?? '', maxSize: 4, description: '', gender: me?.gender ?? 'mixed' })
      toast.success(t('groups.created_toast'))
    },
    onError: (e: Error) => toast.error(e.message || t('groups.create_error')),
  })

  const submitGroup = () => {
    if (!form.name.trim() || !form.city) {
      toast.error(t('groups.name_city_required'))
      return
    }
    if (atGroupLimit) {
      toast.error(`You can create up to ${GROUP_LIMIT} groups per day`)
      return
    }
    create.mutate()
  }

  return (
    <div className="page-container max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-sand-900 dark:text-white tracking-tight">
            {t('groups.page_title')}
          </h1>
          <p className="text-sand-500 dark:text-sand-400 mt-1">
            {t('groups.page_subtitle')}
          </p>
        </div>
        <Button onClick={() => setCreating((v) => !v)}>
          {creating ? <X size={17} /> : <Plus size={17} />}
          {creating ? t('cancel') : t('groups.new_group')}
        </Button>
      </motion.div>

      {/* Create form */}
      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <Card className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label>{t('groups.name_label')}</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                       placeholder={t('groups.name_placeholder')} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t('city')}</Label>
                  <Select value={form.city} onValueChange={(v) => setForm((f) => ({ ...f, city: v }))}>
                    <SelectTrigger><SelectValue placeholder={t('city')} /></SelectTrigger>
                    <SelectContent>
                      {MOROCCAN_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t('groups.max_members')} — {form.maxSize}</Label>
                  <input type="range" min={2} max={8} value={form.maxSize}
                         onChange={(e) => setForm((f) => ({ ...f, maxSize: Number(e.target.value) }))}
                         className="w-full accent-primary-500 cursor-pointer mt-3" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t('groups.gender_label')}</Label>
                <div className="flex items-center gap-2 rounded-lg border border-sand-200 dark:border-[#2F3B39] px-3 py-2">
                  <span className="text-sm font-semibold text-sand-700 dark:text-sand-300">
                    {form.gender === 'male' ? t('groups.men') : form.gender === 'female' ? t('groups.women') : t('groups.mixed_short')}
                  </span>
                  <span className="text-xs text-sand-400 ml-1">{t('profile_page.locked')}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t('groups.desc_label')}</Label>
                <Textarea value={form.description}
                          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                          placeholder={t('groups.desc_placeholder')} rows={3} />
              </div>
              {atGroupLimit && (
                <p className="rounded-xl bg-gold-50 dark:bg-gold-900/20 border border-gold-200 dark:border-gold-700/40 px-4 py-3 text-sm font-medium text-gold-700 dark:text-gold-400 text-center">
                  {t('groups.daily_limit')} — {t('groups.you_can_create')} {GROUP_LIMIT} {t('groups.per_day')}.
                </p>
              )}
              <Button onClick={submitGroup} disabled={create.isPending || atGroupLimit} className="w-full">
                {create.isPending ? <Loader2 size={17} className="animate-spin" /> : t('groups.create')}
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      {!isLoading && (groups ?? []).length > 0 && (
        <div className="space-y-2 mb-4">
          {/* Gender indicator — locked to user's gender */}
          {me?.gender && (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary-500 text-white px-3.5 py-1.5 text-xs font-semibold">
                {me.gender === 'male' ? t('groups.men') : t('groups.women')}
              </span>
              <span className="text-xs text-sand-400">{t('profile_page.locked')}</span>
            </div>
          )}
          {/* City chips */}
          <div className="flex gap-2 flex-wrap">
            {(['all', ...MOROCCAN_CITIES] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCityFilter(c === 'all' ? 'all' : c)}
                className={cn(
                  'rounded-full px-3 py-1 text-[11px] font-semibold transition-colors',
                  cityFilter === (c === 'all' ? 'all' : c)
                    ? 'bg-gold-400 text-gold-800'
                    : 'bg-sand-100 dark:bg-[#222D2B] text-sand-500 dark:text-sand-400 hover:bg-sand-200',
                )}
              >
                {c === 'all' ? t('apt.all_cities') : c}
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <SkeletonGrid count={4} variant="profile" />
      ) : filteredGroups.length === 0 ? (
        <EmptyState icon="👥" title={t('groups.none_found')}
          description={cityFilter !== 'all' ? `${t('groups.none_in')} ${cityFilter} ${t('groups.none_yet')}` : genderFilter === 'all' ? t('groups.start_first') : t('groups.none_found')} />
      ) : (
        <motion.div variants={staggerContainer} initial="initial" animate="animate"
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredGroups.map((g) => <GroupCard key={g.id} group={g} />)}
        </motion.div>
      )}
    </div>
  )
}
