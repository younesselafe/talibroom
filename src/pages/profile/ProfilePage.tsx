import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  MapPin, GraduationCap, Wallet, Sparkles, Pencil, Check, X,
  Heart, MessageSquare, LogOut, Calendar,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { MOROCCAN_CITIES, MOROCCAN_UNIVERSITIES } from '@/types'
import type { Profile } from '@/types'
import Avatar from '@/components/shared/Avatar'
import EmptyState from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatPrice, formatDate, LIFESTYLE_LABELS } from '@/lib/utils'
import { toast } from 'sonner'

function lifestyleTags(p: Profile) {
  const v = p.lifestyle_vec
  if (!v) return [] as string[]
  return [v.sleep_time, v.study_style, v.cleanliness, v.diet]
    .filter(Boolean)
    .map((k) => LIFESTYLE_LABELS[k as string])
    .filter(Boolean)
}

export default function ProfilePage() {
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
  const [draft, setDraft] = useState({
    full_name: me?.full_name ?? '',
    city: me?.city ?? '',
    university: me?.university ?? '',
    budget: me?.budget ?? 2000,
  })

  if (!isOwn && isLoading) {
    return <div className="page-container max-w-2xl"><Skeleton className="h-80 w-full" /></div>
  }
  if (!profile) {
    return (
      <div className="page-container">
        <EmptyState icon="👤" title="Profile not found"
          action={<Button onClick={() => navigate('/discover')}>Back to Discover</Button>} />
      </div>
    )
  }

  const tags = lifestyleTags(profile)

  const save = async () => {
    await updateProfile(draft)
    setEditing(false)
    toast.success('Profile updated ✨')
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
                      transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}>
            <Avatar src={profile.avatar_url} name={profile.full_name} size="xl"
                    isPremium={profile.is_premium}
                    className="ring-4 ring-white dark:ring-[#0D0D0B]" />
          </motion.div>

          {isOwn ? (
            <Button variant={editing ? 'secondary' : 'outline'} size="sm"
                    onClick={() => editing ? setEditing(false) : setEditing(true)}>
              {editing ? <><X size={15} /> Cancel</> : <><Pencil size={15} /> Edit profile</>}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => toast('Opening chat…')}>
                <MessageSquare size={15} />
              </Button>
              <Button size="sm" onClick={() => toast.success('Link Up request sent 🤝')}>
                <Heart size={15} /> Link Up
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
            <Calendar size={13} /> Member since {formatDate(profile.created_at, 'MMM yyyy')}
          </p>
        </motion.div>

        {/* Details / edit form */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }} className="mt-5">
          {editing ? (
            <Card className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label>City</Label>
                <Select value={draft.city} onValueChange={(v) => setDraft((d) => ({ ...d, city: v }))}>
                  <SelectTrigger><SelectValue placeholder="City" /></SelectTrigger>
                  <SelectContent>
                    {MOROCCAN_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>University</Label>
                <Select value={draft.university} onValueChange={(v) => setDraft((d) => ({ ...d, university: v }))}>
                  <SelectTrigger><SelectValue placeholder="University" /></SelectTrigger>
                  <SelectContent>
                    {MOROCCAN_UNIVERSITIES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Monthly budget — {formatPrice(draft.budget)}</Label>
                <input type="range" min={800} max={6000} step={100} value={draft.budget}
                       onChange={(e) => setDraft((d) => ({ ...d, budget: Number(e.target.value) }))}
                       className="w-full accent-primary-500 cursor-pointer" />
              </div>
              <Button onClick={save} className="w-full"><Check size={16} /> Save changes</Button>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { icon: MapPin, label: 'City', value: profile.city ?? '—' },
                { icon: Wallet, label: 'Budget', value: profile.budget ? formatPrice(profile.budget) : '—' },
                { icon: GraduationCap, label: 'University', value: profile.university ?? '—' },
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
            <h2 className="font-bold text-sand-900 dark:text-white mb-2">Lifestyle</h2>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => <Badge key={t} variant="neutral" className="py-1.5 px-3">{t}</Badge>)}
            </div>
          </motion.div>
        )}

        {/* Sign out (own profile) */}
        {isOwn && !editing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                      className="mt-8">
            <Button variant="ghost" className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
                    onClick={() => signOut().then(() => navigate('/login'))}>
              <LogOut size={16} /> Sign out
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
