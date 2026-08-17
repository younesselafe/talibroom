import { useState, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin, GraduationCap, Wallet, Sparkles, Pencil, Check, X,
  Heart, MessageSquare, LogOut, Calendar, Camera, Loader2, Crown, Copy, Ban, Gift,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { FEATURES } from '@/lib/featureFlags'
import { MOROCCAN_CITIES } from '@/types'
import type { GenderEnum, LinkKind, Profile } from '@/types'
import Avatar from '@/components/shared/Avatar'
import EmptyState from '@/components/shared/EmptyState'
import ReportButton from '@/components/shared/ReportButton'
import UniversityField from '@/components/shared/UniversityField'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn, formatPrice, formatDate, LIFESTYLE_LABELS } from '@/lib/utils'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/LanguageContext'

function lifestyleTags(p: Profile) {
  const v = p.lifestyle_json
  if (!v) return [] as string[]
  return [v.sleep_time, v.study_style, v.cleanliness, v.diet]
    .filter(Boolean)
    .map((k) => LIFESTYLE_LABELS[k as string])
    .filter(Boolean)
}

export default function ProfilePage() {
  const { t } = useLanguage()
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile: me, updateProfile, signOut } = useAuthStore()

  const isOwn = !id || id === me?.id
  const { data: fetched, isLoading } = useQuery({
    queryKey: ['profile', id],
    queryFn: () => api.getProfile(id!),
    enabled: !isOwn && !!id,
  })

  const profile = isOwn ? me : fetched
  const [editing, setEditing] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showSupport, setShowSupport] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState({
    full_name: me?.full_name ?? '',
    city: me?.city ?? '',
    university: me?.university ?? '',
    age: (me?.age ?? '') as number | '',
    gender: (me?.gender ?? '') as GenderEnum | '',
    budget: me?.budget ?? 2000,
  })

  const queryClient = useQueryClient()

  // Any existing link between the viewer and this profile — drives the button
  // state and lets us avoid hitting the unique-pair constraint.
  const { data: myLinks } = useQuery({ queryKey: ['links'], queryFn: api.getLinks })
  const existingLink = useMemo(() => {
    if (isOwn || !me || !id) return null
    const between = (myLinks ?? []).filter(
      (l) => (l.sender_id === me.id && l.receiver_id === id)
        || (l.sender_id === id && l.receiver_id === me.id),
    )
    return between.find((l) => l.status === 'accepted')
      ?? between.find((l) => l.status === 'pending')
      ?? between[0] ?? null
  }, [myLinks, me, id, isOwn])

  // Blocking — stops new conversations and messages in both directions (RLS).
  const { data: blockedIds } = useQuery({
    queryKey: ['blocked-ids'],
    queryFn: api.getBlockedIds,
    enabled: !isOwn && !!id,
  })

  const { data: referralCount } = useQuery({
    queryKey: ['my-referral-count'],
    queryFn: api.getMyReferralCount,
    enabled: isOwn && !!me?.id,
  })
  const referralLink = me?.id ? `${window.location.origin}/?ref=${me.id}` : ''
  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink)
    toast.success(t('landing.invite_card_copied'))
  }
  const isBlocked = !!id && !!blockedIds?.has(id)
  const blockToggle = useMutation({
    mutationFn: () => (isBlocked ? api.unblockUser(id!) : api.blockUser(id!)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-ids'] })
      toast.success(isBlocked ? t('profile_page.unblocked_toast') : t('profile_page.blocked_toast'))
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // Send (or re-open) a connection request to the viewed profile. 'roommate'
  // = Link Up, 'direct' = a plain message request.
  // Link Up now opens an active conversation immediately — no "pending" step
  // for 1-on-1 roommate matching. `startConversation` reuses any existing
  // thread, so a rapid double-click can't trip the unique-pair constraint.
  const linkUp = useMutation({
    mutationFn: (kind: LinkKind) => api.startConversation({
      receiver_id: id!,
      kind,
      openingMessage: kind === 'roommate' ? t('msg_roommate') : undefined,
    }),
    onSuccess: ({ link }) => {
      queryClient.invalidateQueries({ queryKey: ['links'] })
      navigate(`/chat/${link.id}`)
    },
    onError: (e: Error) => toast.error(e.message || 'Could not start the conversation'),
  })

  if (!isOwn && isLoading) {
    return <div className="page-container max-w-2xl"><Skeleton className="h-80 w-full" /></div>
  }
  if (!profile) {
    return (
      <div className="page-container">
        <EmptyState icon="👤" title={t('profileNotFound')}
          action={<Button onClick={() => navigate('/discover')}>{t('backToDiscover')}</Button>} />
      </div>
    )
  }

  const tags = lifestyleTags(profile)

  const save = async () => {
    if (draft.age !== '' && (draft.age < 16 || draft.age > 99)) {
      toast.error(t('ageError'))
      return
    }
    try {
      await updateProfile({
        ...draft,
        age: draft.age === '' ? null : draft.age,
        gender: draft.gender || null,
      })
      setEditing(false)
      toast.success(t('profileUpdated'))
    } catch (err) {
      // updateProfile rolls back its optimistic write before throwing.
      toast.error((err as Error).message || 'Could not save your profile')
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // let the same file be re-picked later
    if (!file) return
    setUploadingAvatar(true)
    try {
      const url = await api.uploadImage('avatars', file)
      await updateProfile({ avatar_url: url })
      toast.success(t('profile_page.photo_updated'))
    } catch (err) {
      toast.error((err as Error).message || 'Could not upload your photo')
    } finally {
      setUploadingAvatar(false)
    }
  }

  return (
    <div className="page-container max-w-2xl">
      {/* Cover + avatar */}
      <motion.div
        initial={{ opacity: 0, scale: 0.99 }} animate={{ opacity: 1, scale: 1 }}
        className="relative rounded-3xl overflow-hidden h-36 bg-hero-gradient"
      >
        <div className="absolute inset-0 opacity-25"
             style={{ backgroundImage: 'radial-gradient(circle at 30% 40%, white 1.5px, transparent 1.5px)', backgroundSize: '28px 28px' }} />
      </motion.div>

      <div className="px-1 -mt-12">
        <div className="flex items-end justify-between">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
                      className="relative">
            <Avatar src={profile.avatar_url} name={profile.full_name} size="xl"
                    isPremium={profile.is_premium}
                    className="ring-4 ring-white dark:ring-[#16201E]" />
            {isOwn && (
              <>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleAvatarChange}
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  aria-label={t('profile_page.change_photo')}
                  className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full bg-primary-500 text-white shadow-md ring-2 ring-white transition hover:bg-primary-600 disabled:opacity-70 dark:ring-[#16201E]"
                >
                  {uploadingAvatar
                    ? <Loader2 size={16} className="animate-spin" />
                    : <Camera size={16} />}
                </button>
              </>
            )}
          </motion.div>

          {isOwn ? (
            <Button variant={editing ? 'secondary' : 'outline'} size="sm"
                    onClick={() => editing ? setEditing(false) : setEditing(true)}>
              {editing ? <><X size={15} /> {t('cancel')}</> : <><Pencil size={15} /> {t('editProfile')}</>}
            </Button>
          ) : existingLink?.status === 'accepted' ? (
            <Button size="sm" onClick={() => navigate(`/chat/${existingLink.id}`)}>
              <MessageSquare size={15} /> {t('message')}
            </Button>
          ) : existingLink?.status === 'pending' ? (
            <Button size="sm" variant="secondary" disabled>
              <Check size={15} /> {t('requestSent')}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="outline"
                      disabled={linkUp.isPending}
                      onClick={() => linkUp.mutate('direct')}>
                <MessageSquare size={15} />
              </Button>
              <Button size="sm"
                      disabled={linkUp.isPending}
                      onClick={() => linkUp.mutate('roommate')}>
                <Heart size={15} /> {t('linkUp')}
              </Button>
            </div>
          )}
        </div>

        {/* Name / info */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }} className="mt-3">
          {editing ? (
            <Input value={draft.full_name} onChange={(e) => setDraft((d) => ({ ...d, full_name: e.target.value }))}
                   className="text-xl font-black h-12" />
          ) : (
            <h1 className="text-2xl font-black text-sand-900 dark:text-white flex items-center gap-2">
              {profile.full_name}
              {profile.is_premium && <Badge variant="gold"><Sparkles size={11} /> Premium</Badge>}
            </h1>
          )}
          <p className="text-sm text-sand-400 mt-0.5 flex items-center gap-1.5">
            {profile.gender ? (
              <span className="font-semibold text-sand-500">
                {profile.gender === 'female' ? t('woman') : t('man')} ·
              </span>
            ) : null}
            {profile.age ? <span className="font-semibold text-sand-500">{profile.age} {t('profile_page.yrs')} ·</span> : null}
            <Calendar size={13} /> {t('memberSince')} {formatDate(profile.created_at, 'MMM yyyy')}
          </p>
        </motion.div>

        {/* Details / edit form */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }} className="mt-5">
          {editing ? (
            <Card className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label>{t('city')}</Label>
                <Select value={draft.city} onValueChange={(v) => setDraft((d) => ({ ...d, city: v }))}>
                  <SelectTrigger><SelectValue placeholder={t('city')} /></SelectTrigger>
                  <SelectContent>
                    {MOROCCAN_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('university')}</Label>
                <UniversityField
                  value={draft.university}
                  onChange={(v) => setDraft((d) => ({ ...d, university: v }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-age">{t('age')}</Label>
                {me?.age ? (
                  <p className="rounded-xl border border-sand-200 dark:border-[#2F3B39] px-3 py-2.5 text-sm font-semibold text-sand-700 dark:text-sand-300 bg-sand-50 dark:bg-[#1E1E1A]">
                    {me.age} {t('profile_page.yrs')}
                    <span className="ml-2 text-xs font-normal text-sand-400">{t('profile_page.locked')}</span>
                  </p>
                ) : (
                  <Input
                    id="profile-age"
                    type="number"
                    min={16}
                    max={99}
                    inputMode="numeric"
                    placeholder="e.g. 21"
                    value={draft.age}
                    onChange={(e) => setDraft((d) => ({
                      ...d,
                      age: e.target.value === '' ? '' : Number(e.target.value),
                    }))}
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <Label>{t('profile_page.gender')}</Label>
                {me?.gender ? (
                  <p className="rounded-xl border border-sand-200 dark:border-[#2F3B39] px-3 py-2.5 text-sm font-semibold text-sand-700 dark:text-sand-300 bg-sand-50 dark:bg-[#1E1E1A]">
                    {me.gender === 'female' ? `👩 ${t('woman')}` : `👨 ${t('man')}`}
                    <span className="ml-2 text-xs font-normal text-sand-400">{t('profile_page.locked')}</span>
                  </p>
                ) : (
                  <div className="flex gap-2">
                    {(['female', 'male'] as GenderEnum[]).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setDraft((d) => ({ ...d, gender: g }))}
                        className={cn(
                          'flex-1 rounded-xl border-2 py-2.5 text-sm font-semibold capitalize transition-colors',
                          draft.gender === g
                            ? 'border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-300'
                            : 'border-sand-200 text-sand-500 dark:border-[#2F3B39] dark:text-sand-400',
                        )}
                      >
                        {g === 'female' ? `👩 ${t('woman')}` : `👨 ${t('man')}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>{t('profile_page.budget_monthly')} — {formatPrice(draft.budget)}</Label>
                <input type="range" min={800} max={6000} step={100} value={draft.budget}
                       onChange={(e) => setDraft((d) => ({ ...d, budget: Number(e.target.value) }))}
                       className="w-full accent-primary-500 cursor-pointer" />
              </div>
              <Button onClick={save} className="w-full"><Check size={16} /> {t('saveChanges')}</Button>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { icon: MapPin, label: t('city'), value: profile.city ?? '—' },
                { icon: Wallet, label: t('budget'), value: profile.budget ? formatPrice(profile.budget) : '—' },
                { icon: GraduationCap, label: t('university'), value: profile.university ?? '—' },
              ].map(({ icon: Icon, label, value }) => (
                <Card key={label} className="p-4">
                  <Icon size={16} className="text-primary-500" />
                  <p className="text-[11px] text-sand-400 mt-2">{label}</p>
                  <p className="text-sm font-bold text-sand-900 dark:text-white truncate">{value}</p>
                </Card>
              ))}
            </div>
          )}
        </motion.div>

        {/* Lifestyle */}
        {!editing && tags.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }} className="mt-5">
            <h2 className="font-bold text-sand-900 dark:text-white mb-2">{t('lifestyle')}</h2>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => <Badge key={t} variant="neutral" className="py-1.5 px-3">{t}</Badge>)}
            </div>
          </motion.div>
        )}

        {/* Report + block (other students' profiles) */}
        {!isOwn && (
          <div className="mt-8 flex items-center gap-4">
            <ReportButton
              targetType="profile"
              targetId={profile.id}
              reportedUserId={profile.id}
              withLabel
            />
            <button
              type="button"
              disabled={blockToggle.isPending}
              onClick={() => blockToggle.mutate()}
              className="flex items-center gap-1.5 text-xs font-semibold text-sand-400 hover:text-red-500 transition-colors disabled:opacity-60"
            >
              <Ban size={13} />
              {isBlocked ? t('profile_page.unblock') : t('profile_page.block')}
            </button>
          </div>
        )}

        {/* Own profile CTAs */}
        {isOwn && !editing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                      className="mt-8 space-y-3">
            {/* Invite & Win */}
            <div className="rounded-2xl bg-gradient-to-br from-gold-400 to-amber-300 p-4">
              <div className="flex items-center gap-2 text-white">
                <Gift size={16} />
                <p className="font-black text-sm">{t('landing.invite_card_title')}</p>
              </div>
              <p className="text-xs text-white/90 mt-1 leading-relaxed">{t('landing.invite_card_desc')}</p>
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2">
                <p className="flex-1 text-xs font-mono text-white truncate">{referralLink}</p>
                <button onClick={copyReferralLink} className="text-white hover:text-white/80 transition-colors flex-shrink-0" aria-label={t('landing.invite_card_copy')}>
                  <Copy size={14} />
                </button>
              </div>
              <p className="text-[11px] font-semibold text-white/90 mt-2">
                {t('landing.invite_card_count', { count: referralCount ?? 0 })}
              </p>
            </div>

            {/* Upgrade CTA — non-premium only */}
            {FEATURES.premium && !profile.is_premium && (
              <Button
                onClick={() => navigate('/upgrade')}
                className="w-full bg-gold-500 hover:bg-gold-600 text-white gap-2"
              >
                <Crown size={16} /> {t('unlockPremium')}
              </Button>
            )}

            {/* Support the Dev */}
            <Button variant="outline" className="w-full gap-2"
                    onClick={() => setShowSupport((v) => !v)}>
              ☕ {showSupport ? t('close') : t('profile_page.support_title')}
            </Button>
            <AnimatePresence>
              {showSupport && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden rounded-2xl border border-amber-200 dark:border-amber-800/40 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-[#1A1510] dark:to-[#1C1710]"
                >
                  <div className="px-4 py-4 space-y-3">
                    <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
                      Hey fam. We built Talibroom because we know exactly how much of a nightmare it is to find a decent
                      roommate or apartment as a student. We literally coded this whole platform while studying Génie
                      Informatique just to fix this broken system for all of us. We are keeping the core app 100% free,
                      but servers cost money. If Talibroom helped you secure your crib, consider dropping a small donation
                      to keep the servers running. ❤️
                    </p>
                    <div className="space-y-1.5">
                      {[
                        { label: 'RIB', value: 'CIH Bank — 230 810 0000123456789012 00' },
                      ].map(({ label, value }) => (
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
                      Any amount helps. Thank you fr. 🙏
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sign out */}
            <Button variant="ghost" className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
                    onClick={() => signOut().then(() => navigate('/login'))}>
              <LogOut size={16} /> {t('signOut')}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
