import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, MapPin, Users, X, Crown, Loader2 } from 'lucide-react'
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
import { toast } from 'sonner'

const STATUS_BADGE: Record<GroupStatus, { label: string; variant: 'green' | 'neutral' | 'gold' }> = {
  open:    { label: 'Open to join', variant: 'green' },
  closed:  { label: 'Closed',       variant: 'neutral' },
  matched: { label: 'Matched 🎉',   variant: 'gold' },
}

function GroupCard({ group, onJoin }: { group: Group; onJoin: () => void }) {
  const { label, variant } = STATUS_BADGE[group.status]
  const members = group.members ?? []
  const count = group.member_count ?? members.length
  const full = count >= group.max_size

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
                      size="sm" className="ring-2 ring-white dark:ring-[#1C1C1A]" />
            ))}
            {members.length === 0 && (
              <div className="w-8 h-8 rounded-full bg-sand-100 dark:bg-[#2A2A26] flex items-center justify-center">
                <Users size={13} className="text-sand-400" />
              </div>
            )}
          </div>
          <span className="text-xs font-semibold text-sand-500">
            {count}/{group.max_size} members
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-sand-100 dark:border-[#2A2A26]">
        <span className="flex items-center gap-1.5 text-xs text-sand-400">
          <Crown size={13} className="text-gold-500" />
          {group.owner?.full_name?.split(' ')[0] ?? 'Owner'}
        </span>
        <motion.div whileTap={{ scale: 0.96 }} className="ml-auto">
          <Button
            size="sm"
            variant={full || group.status !== 'open' ? 'secondary' : 'default'}
            disabled={full || group.status !== 'open'}
            onClick={onJoin}
          >
            {group.status === 'matched' ? 'Matched' : full ? 'Full' : 'Request to join'}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  )
}

export default function GroupsPage() {
  const me = useAuthStore((s) => s.profile)
  const { data: groups, isLoading } = useQuery({ queryKey: ['groups'], queryFn: api.getGroups })

  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', city: me?.city ?? '', maxSize: 4, description: '' })

  const createGroup = async () => {
    if (!form.name.trim() || !form.city) return toast.error('Give your group a name and city')
    setSaving(true)
    await new Promise((r) => setTimeout(r, 600))
    setSaving(false)
    setCreating(false)
    setForm({ name: '', city: me?.city ?? '', maxSize: 4, description: '' })
    toast.success('Group created — invite your friends! 🏡')
  }

  return (
    <div className="page-container max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-sand-900 dark:text-white tracking-tight">
            House-hunting groups
          </h1>
          <p className="text-sand-500 dark:text-sand-400 mt-1">
            Team up with other students to find — and split — the perfect place.
          </p>
        </div>
        <Button onClick={() => setCreating((v) => !v)}>
          {creating ? <X size={17} /> : <Plus size={17} />}
          {creating ? 'Cancel' : 'New group'}
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
                <Label>Group name</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                       placeholder="e.g. Coloc Casa — Maarif" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Select value={form.city} onValueChange={(v) => setForm((f) => ({ ...f, city: v }))}>
                    <SelectTrigger><SelectValue placeholder="City" /></SelectTrigger>
                    <SelectContent>
                      {MOROCCAN_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Max members — {form.maxSize}</Label>
                  <input type="range" min={2} max={8} value={form.maxSize}
                         onChange={(e) => setForm((f) => ({ ...f, maxSize: Number(e.target.value) }))}
                         className="w-full accent-primary-500 cursor-pointer mt-3" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={form.description}
                          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                          placeholder="What are you looking for? Budget, neighbourhood, vibe…" rows={3} />
              </div>
              <Button onClick={createGroup} disabled={saving} className="w-full">
                {saving ? <Loader2 size={17} className="animate-spin" /> : 'Create group'}
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <SkeletonGrid count={4} variant="profile" />
      ) : (groups ?? []).length === 0 ? (
        <EmptyState icon="👥" title="No groups yet" description="Start the first house-hunting group." />
      ) : (
        <motion.div variants={staggerContainer} initial="initial" animate="animate"
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(groups ?? []).map((g) => (
            <GroupCard key={g.id} group={g}
                       onJoin={() => toast.success(`Join request sent to "${g.name}"`)} />
          ))}
        </motion.div>
      )}
    </div>
  )
}
