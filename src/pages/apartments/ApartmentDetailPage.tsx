import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  MapPin, BedDouble, Users, Sparkles, BadgeCheck, Play,
  Phone, MessageSquare, ArrowLeft, ShieldCheck,
} from 'lucide-react'
import { api } from '@/lib/api'
import Avatar from '@/components/shared/Avatar'
import EmptyState from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { formatPrice, formatDate } from '@/lib/utils'
import { toast } from 'sonner'

export default function ApartmentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: apt, isLoading } = useQuery({
    queryKey: ['apartment', id],
    queryFn: () => api.getApartment(id!),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="page-container max-w-4xl space-y-4">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (!apt) {
    return (
      <div className="page-container">
        <EmptyState icon="🏚️" title="Listing not found"
          description="This apartment may have been removed."
          action={<Button onClick={() => navigate('/apartments')}>Back to apartments</Button>} />
      </div>
    )
  }

  const verified = apt.owner_type === 'realtor' && apt.realtor?.verified
  const ownerName = apt.owner_type === 'realtor'
    ? apt.realtor?.full_name ?? 'Realtor'
    : apt.student_owner?.full_name ?? 'Student'
  const ownerSub = apt.owner_type === 'realtor'
    ? apt.realtor?.agency_name ?? 'Independent agent'
    : apt.student_owner?.university ?? 'Student listing'

  const facts = [
    { icon: MapPin, label: 'City', value: apt.city },
    { icon: BedDouble, label: 'Rooms', value: String(apt.rooms) },
    { icon: Users, label: 'Slots left', value: `${apt.available_slots} / ${apt.total_slots}` },
  ]

  return (
    <div className="page-container max-w-4xl">
      <button onClick={() => navigate(-1)} className="btn-ghost mb-4 -ml-3">
        <ArrowLeft size={18} /> Back
      </button>

      {/* Hero image */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative rounded-3xl overflow-hidden h-64 sm:h-96 bg-sand-100 dark:bg-[#2A2A26]"
      >
        <img src={apt.image_url ?? ''} alt={apt.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-card-gradient" />
        <div className="absolute top-4 left-4 flex gap-2">
          {apt.is_premium && (
            <Badge variant="gold" className="bg-white/95 backdrop-blur">
              <Sparkles size={11} /> Premium
            </Badge>
          )}
          {apt.video_url && (
            <Badge variant="neutral" className="bg-white/95 backdrop-blur">
              <Play size={11} /> Video tour
            </Badge>
          )}
        </div>
        <div className="absolute bottom-4 left-5 right-5">
          <p className="text-white/80 text-sm">{formatPrice(apt.price)} / month</p>
          <h1 className="text-white font-black text-xl sm:text-3xl leading-tight mt-1 drop-shadow">
            {apt.title}
          </h1>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Facts */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-3"
          >
            {facts.map(({ icon: Icon, label, value }) => (
              <Card key={label} className="p-4 flex flex-col items-center gap-1 text-center">
                <Icon size={20} className="text-primary-500" />
                <span className="font-black text-sand-900 dark:text-white">{value}</span>
                <span className="text-xs text-sand-400">{label}</span>
              </Card>
            ))}
          </motion.div>

          {/* Description */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h2 className="font-bold text-lg text-sand-900 dark:text-white mb-2">About this place</h2>
            <p className="text-sand-600 dark:text-sand-300 leading-relaxed whitespace-pre-line">
              {apt.description ?? 'No description provided.'}
            </p>
            <p className="text-xs text-sand-400 mt-4">Listed on {formatDate(apt.created_at)}</p>
          </motion.div>
        </div>

        {/* Sidebar — owner + CTA */}
        <motion.div
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-5 sticky top-20 space-y-4">
            <div className="flex items-center gap-3">
              <Avatar
                src={apt.owner_type === 'realtor' ? apt.realtor?.avatar_url : apt.student_owner?.avatar_url}
                name={ownerName} size="lg"
              />
              <div className="min-w-0">
                <p className="font-bold text-sand-900 dark:text-white flex items-center gap-1">
                  {ownerName}
                  {verified && <BadgeCheck size={15} className="text-blue-500" />}
                </p>
                <p className="text-xs text-sand-400 truncate">{ownerSub}</p>
              </div>
            </div>

            {verified && (
              <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/15 rounded-lg p-2.5">
                <ShieldCheck size={15} />
                Identity & agency verified by MoRoom
              </div>
            )}

            <motion.div whileTap={{ scale: 0.97 }}>
              <Button className="w-full" onClick={() => toast.success('Inquiry sent — the owner will reply in your Inbox')}>
                <MessageSquare size={16} /> Send inquiry
              </Button>
            </motion.div>
            <Button variant="outline" className="w-full"
                    onClick={() => toast('Phone number revealed after the owner accepts your inquiry')}>
              <Phone size={16} /> Request phone
            </Button>
            <p className="text-[11px] text-sand-400 text-center">
              Never pay a deposit before visiting in person.
            </p>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
