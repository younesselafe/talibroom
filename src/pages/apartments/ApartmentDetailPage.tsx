import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  MapPin, BedDouble, Users, Sparkles, BadgeCheck, Play,
  Phone, MessageSquare, ArrowLeft, ShieldCheck,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import Avatar from '@/components/shared/Avatar'
import EmptyState from '@/components/shared/EmptyState'
import ReportButton from '@/components/shared/ReportButton'
import ImageCarousel from '@/components/shared/ImageCarousel'
import Lightbox from '@/components/shared/Lightbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { formatPrice, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/LanguageContext'

export default function ApartmentDetailPage() {
  const { t } = useLanguage()
  const { id } = useParams()
  const navigate = useNavigate()
  const me = useAuthStore((s) => s.profile)
  const queryClient = useQueryClient()
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

  const { data: apt, isLoading } = useQuery({
    queryKey: ['apartment', id],
    queryFn: () => api.getApartment(id!),
    enabled: !!id,
  })

  // student_owner_id holds the profile UUID for both student listings and
  // self-serve realtor accounts. Agency realtors (realtor_id set, no profile)
  // have student_owner_id = null, so this correctly returns null for them.
  const ownerId = apt?.student_owner_id ?? null
  const canAccessRealtor = !!(me?.is_premium || me?.account_type === 'realtor')

  // Reuse any existing conversation with this owner rather than inserting a
  // duplicate link (which would violate the unique-pair constraint).
  const { data: myLinks } = useQuery({ queryKey: ['links'], queryFn: api.getLinks })
  const existingLink = useMemo(() => {
    if (!ownerId || !me) return null
    return (myLinks ?? []).find(
      (l) => (l.sender_id === me.id && l.receiver_id === ownerId)
        || (l.sender_id === ownerId && l.receiver_id === me.id),
    ) ?? null
  }, [myLinks, ownerId, me])

  // Contact the owner: reuse-or-open the conversation and seed it with an
  // opening message, then jump straight into the chat. Idempotent — a second
  // click reuses the same thread instead of crashing on the unique-pair rule.
  const inquiry = useMutation({
    mutationFn: () => api.startConversation({
      receiver_id: ownerId!,
      kind: 'apartment_inquiry',
      context_id: apt!.id,
      context_label: apt!.title,
      openingMessage: t('msg_apartment_interest').replace('{title}', apt!.title),
    }),
    onSuccess: ({ link }) => {
      queryClient.invalidateQueries({ queryKey: ['links'] })
      toast.success(t('apt.detail.message_sent'))
      navigate(`/chat/${link.id}`)
    },
    onError: (e: Error) => toast.error(e.message || t('apt.detail.contact_error')),
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
    // RLS hides realtor listings from free students, so a missing row can
    // mean either "deleted" or "premium-gated" — offer both paths.
    return (
      <div className="page-container">
        <EmptyState icon="🏚️" title={t('apt.detail.not_found')}
          description={canAccessRealtor ? t('apt.detail.removed') : t('apt.detail.maybe_locked')}
          action={
            <div className="flex flex-col items-center gap-2">
              {!canAccessRealtor && (
                <Button onClick={() => navigate('/upgrade')}>{t('unlockPremium')}</Button>
              )}
              <Button variant="outline" onClick={() => navigate('/apartments')}>{t('apt.detail.back')}</Button>
            </div>
          } />
      </div>
    )
  }

  // Realtor-owned but gated for non-premium students.
  if (apt.owner_type === 'realtor' && !canAccessRealtor) {
    return (
      <div className="page-container max-w-2xl flex flex-col items-center justify-center gap-6 py-24 text-center">
        <div className="text-5xl">🔒</div>
        <h2 className="text-2xl font-black text-sand-900 dark:text-white">{t('apt.detail.premium_locked')}</h2>
        <p className="text-sand-500 dark:text-sand-400">{t('apt.detail.premium_locked_desc')}</p>
        <Button onClick={() => navigate('/upgrade')}>{t('unlockPremium')}</Button>
        <button onClick={() => navigate(-1)} className="text-sm text-sand-400 hover:text-sand-600">{t('back')}</button>
      </div>
    )
  }

  const verified = apt.owner_type === 'realtor' && apt.realtor?.verified
  // For self-serve realtor accounts: student_owner holds their profile; realtor_id is null.
  const isRealtorAccount = apt.owner_type === 'realtor' && !apt.realtor_id && !!apt.student_owner_id
  const ownerName = apt.owner_type === 'realtor'
    ? apt.realtor?.full_name ?? apt.student_owner?.full_name ?? 'Realtor'
    : apt.student_owner?.full_name ?? 'Student'
  const ownerSub = apt.owner_type === 'realtor'
    ? apt.realtor?.agency_name ?? (isRealtorAccount ? t('realtor_badge') : t('realtors.independent'))
    : apt.student_owner?.university ?? t('apt.detail.student_listing')

  const facts = [
    { icon: MapPin, label: t('city'), value: apt.city },
    { icon: BedDouble, label: t('apt.detail.rooms'), value: String(apt.rooms) },
    { icon: Users, label: t('apt.detail.slots_left'), value: `${apt.available_slots} / ${apt.total_slots}` },
  ]

  return (
    <div className="page-container max-w-4xl">
      <button onClick={() => navigate(-1)} className="btn-ghost mb-4 -ml-3">
        <ArrowLeft size={18} /> {t('back')}
      </button>

      {/* Hero image */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <ImageCarousel
          images={apt.image_urls}
          alt={apt.title}
          className="h-64 sm:h-96 rounded-3xl"
          onImageClick={setLightboxIdx}
          overlay={
            <>
              <div className="absolute inset-0 bg-card-gradient" />
              <div className="absolute top-4 left-4 flex gap-2">
                {apt.is_premium && (
                  <Badge variant="gold" className="bg-white/95 backdrop-blur">
                    <Sparkles size={11} /> Premium
                  </Badge>
                )}
                {apt.video_url && (
                  <Badge variant="neutral" className="bg-white/95 backdrop-blur">
                    <Play size={11} /> {t('apt.detail.video_tour')}
                  </Badge>
                )}
              </div>
              <div className="absolute bottom-4 left-5 right-5">
                <p className="text-white/80 text-sm">{formatPrice(apt.price)} / month</p>
                <h1 className="text-white font-black text-xl sm:text-3xl leading-tight mt-1 drop-shadow">
                  {apt.title}
                </h1>
              </div>
            </>
          }
        />
      </motion.div>

      {/* Video tour */}
      {apt.video_url && (
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-4"
        >
          <p className="text-xs font-bold uppercase tracking-wide text-gold-600 dark:text-gold-400 mb-2 flex items-center gap-1.5">
            <Play size={13} /> {t('apt.detail.video_tour')}
          </p>
          <video
            src={apt.video_url}
            controls
            playsInline
            className="w-full max-h-80 rounded-2xl bg-black object-contain"
          />
        </motion.div>
      )}

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
            <h2 className="font-bold text-lg text-sand-900 dark:text-white mb-2">{t('apt.detail.about')}</h2>
            <p className="flex items-center gap-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 mb-2">
              <MapPin size={15} />
              {apt.address ? `${apt.address}, ${apt.city}` : apt.city}
            </p>
            <p className="text-sand-600 dark:text-sand-300 leading-relaxed whitespace-pre-line">
              {apt.description ?? t('apt.detail.no_description')}
            </p>
            <p className="text-xs text-sand-400 mt-4">{t('apt.detail.listed_on')} {formatDate(apt.created_at)}</p>
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
                {t('apt.detail.verified_identity')}
              </div>
            )}

            <motion.div whileTap={{ scale: 0.97 }}>
              {existingLink ? (
                <Button className="w-full" onClick={() => navigate(`/chat/${existingLink.id}`)}>
                  <MessageSquare size={16} /> {t('apt.detail.open_conversation')}
                </Button>
              ) : (
                <Button
                  className="w-full"
                  disabled={inquiry.isPending}
                  onClick={() => {
                    if (!ownerId) {
                      toast(t('apt.detail.agency_listing'))
                      return
                    }
                    if (ownerId === me?.id) {
                      toast(t('apt.detail.own_listing'))
                      return
                    }
                    inquiry.mutate()
                  }}
                >
                  <MessageSquare size={16} /> {inquiry.isPending ? t('apt.detail.contacting') : t('apt.detail.contact_owner')}
                </Button>
              )}
            </motion.div>
            {/* Real call link when the agency has a phone on file — the old
                "request phone" button was a dead-end toast. */}
            {apt.realtor?.phone && (
              <Button variant="outline" className="w-full" asChild>
                <a href={`tel:${apt.realtor.phone.replace(/\s/g, '')}`}>
                  <Phone size={16} /> {t('apt.detail.call_owner')}
                </a>
              </Button>
            )}
            <p className="text-[11px] text-sand-400 text-center">
              {t('apt.detail.safety_tip')}
            </p>
            {ownerId !== me?.id && (
              <div className="flex justify-center pt-1">
                <ReportButton
                  targetType="apartment"
                  targetId={apt.id}
                  reportedUserId={apt.student_owner_id ?? null}
                  withLabel
                />
              </div>
            )}
          </Card>
        </motion.div>
      </div>
      {lightboxIdx !== null && apt.image_urls.length > 0 && (
        <Lightbox
          images={apt.image_urls}
          index={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onNav={setLightboxIdx}
        />
      )}
    </div>
  )
}
