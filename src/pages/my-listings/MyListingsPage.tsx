import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Plus, MapPin, BedDouble, Eye, Pencil, Trash2, ShoppingBag, Loader2, Minus, Users,
} from 'lucide-react'
import { api } from '@/lib/api'
import type { Apartment } from '@/types'
import EmptyState from '@/components/shared/EmptyState'
import SkeletonGrid from '@/components/shared/SkeletonCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { formatPrice, formatRelativeTime } from '@/lib/utils'
import { staggerContainer, staggerItem } from '@/components/ui/motion'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/LanguageContext'

/** Two-tap delete — first tap arms, second tap (within 3s) confirms.
 *  Replaces window.confirm, which is stripped in some mobile in-app browsers. */
function DeleteButton({ pending, onConfirm }: { pending: boolean; onConfirm: () => void }) {
  const { t } = useLanguage()
  const [armed, setArmed] = useState(false)

  const click = () => {
    if (!armed) {
      setArmed(true)
      setTimeout(() => setArmed(false), 3000)
      return
    }
    setArmed(false)
    onConfirm()
  }

  return (
    <Button
      size={armed ? 'sm' : 'icon'}
      variant={armed ? 'destructive' : 'ghost'}
      disabled={pending}
      onClick={click}
      aria-label={armed ? t('myList.confirm_delete') : t('delete')}
    >
      {pending
        ? <Loader2 size={15} className="animate-spin" />
        : armed
          ? <span className="text-xs font-bold">{t('myList.tap_confirm')}</span>
          : <Trash2 size={15} className="text-red-500" />}
    </Button>
  )
}

/** Inline available-slots control — the data was previously write-once. */
function SlotsAdjuster({ apt }: { apt: Apartment }) {
  const { t } = useLanguage()
  const qc = useQueryClient()
  const adjust = useMutation({
    mutationFn: (next: number) => api.updateApartment(apt.id, { available_slots: next }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-apartments'] }),
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <Users size={12} className="text-primary-400" />
      <span className="text-[11px] font-semibold text-sand-500 dark:text-sand-400">
        {t('myList.spots')}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={t('myList.spot_minus')}
          disabled={adjust.isPending || apt.available_slots <= 0}
          onClick={() => adjust.mutate(apt.available_slots - 1)}
          className="grid h-5 w-5 place-items-center rounded-full bg-sand-100 dark:bg-[#222D2B] text-sand-600 dark:text-sand-300 disabled:opacity-40"
        >
          <Minus size={11} />
        </button>
        <span className="min-w-[34px] text-center text-[11px] font-black text-sand-700 dark:text-sand-200">
          {apt.available_slots}/{apt.total_slots}
        </span>
        <button
          type="button"
          aria-label={t('myList.spot_plus')}
          disabled={adjust.isPending || apt.available_slots >= apt.total_slots}
          onClick={() => adjust.mutate(apt.available_slots + 1)}
          className="grid h-5 w-5 place-items-center rounded-full bg-sand-100 dark:bg-[#222D2B] text-sand-600 dark:text-sand-300 disabled:opacity-40"
        >
          <Plus size={11} />
        </button>
      </div>
    </div>
  )
}

export default function MyListingsPage() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const qc = useQueryClient()

  // Scoped queries — previously this page downloaded EVERY apartment and
  // EVERY post in the app just to filter for the user's own rows.
  const { data: myApartments = [], isLoading: aptLoading } = useQuery({
    queryKey: ['my-apartments'], queryFn: api.getMyApartments,
  })
  const { data: myPosts = [], isLoading: postLoading } = useQuery({
    queryKey: ['my-posts'], queryFn: api.getMyPosts,
  })
  const myItems = myPosts.filter((p) => p.type === 'marketplace')

  const deleteApt = useMutation({
    mutationFn: (id: string) => api.deleteApartment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-apartments'] })
      qc.invalidateQueries({ queryKey: ['apartments'] })
      toast.success(t('myList.deleted_toast'))
    },
    onError: (e: Error) => toast.error(e.message || 'Could not delete the listing'),
  })

  const deleteItem = useMutation({
    mutationFn: (id: string) => api.deletePost(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-posts'] })
      qc.invalidateQueries({ queryKey: ['posts'] })
      toast.success(t('myList.removed_toast'))
    },
    onError: (e: Error) => toast.error(e.message || 'Could not remove the item'),
  })

  return (
    <div className="page-container max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-sand-900 dark:text-white tracking-tight">
            {t('myListingsTitle')}
          </h1>
          <p className="text-sand-500 dark:text-sand-400 mt-1">{t('myListingsSubtitle')}</p>
        </div>
        <Button onClick={() => navigate('/apartments/new')}><Plus size={17} /> {t('newBtn')}</Button>
      </motion.div>

      <Tabs defaultValue="apartments">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="apartments" className="flex-1 sm:flex-none">{t('myList.apartments_tab')}</TabsTrigger>
          <TabsTrigger value="marketplace" className="flex-1 sm:flex-none">{t('myList.marketplace_tab')}</TabsTrigger>
        </TabsList>

        {/* Apartments */}
        <TabsContent value="apartments">
          {aptLoading ? (
            <SkeletonGrid count={2} variant="apartment" className="sm:grid-cols-2 lg:grid-cols-2" />
          ) : myApartments.length === 0 ? (
            <EmptyState icon="🏠" title={t('noApartmentsListed')}
              description={t('noApartmentsDesc')}
              action={<Button onClick={() => navigate('/apartments/new')}><Plus size={16} /> {t('createListing')}</Button>} />
          ) : (
            <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
              {myApartments.map((a) => (
                <motion.div key={a.id} variants={staggerItem} className="card p-3 flex gap-3 items-center">
                  <img src={a.image_urls[0] ?? ''} alt="" loading="lazy" decoding="async"
                       className="w-24 h-20 rounded-xl object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sand-900 dark:text-white text-sm truncate">{a.title}</p>
                    <p className="text-xs text-sand-400 flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-1"><MapPin size={11} />{a.city}</span>
                      <span className="flex items-center gap-1"><BedDouble size={11} />{a.rooms}</span>
                    </p>
                    <p className="text-sm font-black text-primary-600 dark:text-primary-400 mt-1">
                      {formatPrice(a.price)}
                    </p>
                    <SlotsAdjuster apt={a} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Button size="icon" variant="outline" onClick={() => navigate(`/apartments/${a.id}`)}>
                      <Eye size={15} />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => navigate(`/apartments/${a.id}/edit`)}>
                      <Pencil size={15} />
                    </Button>
                    <DeleteButton
                      pending={deleteApt.isPending && deleteApt.variables === a.id}
                      onConfirm={() => deleteApt.mutate(a.id)}
                    />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </TabsContent>

        {/* Marketplace */}
        <TabsContent value="marketplace">
          {postLoading ? (
            <SkeletonGrid count={2} variant="apartment" className="sm:grid-cols-2 lg:grid-cols-2" />
          ) : myItems.length === 0 ? (
            <EmptyState icon="🛍️" title={t('nothingForSale')}
              description={t('nothingForSaleDesc')}
              action={<Button onClick={() => navigate('/community')}><ShoppingBag size={16} /> {t('goToMarketplace')}</Button>} />
          ) : (
            <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
              {myItems.map((p) => (
                <motion.div key={p.id} variants={staggerItem} className="card p-3 flex gap-3 items-center">
                  {p.image_url && (
                    <img src={p.image_url} alt="" loading="lazy" decoding="async"
                         className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sand-700 dark:text-sand-200 text-sm line-clamp-2">{p.content}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="neutral">{p.category}</Badge>
                      {p.is_sold && <Badge variant="green">{t('sold')}</Badge>}
                      <span className="text-[11px] text-sand-400">{formatRelativeTime(p.created_at)}</span>
                    </div>
                  </div>
                  <DeleteButton
                    pending={deleteItem.isPending && deleteItem.variables === p.id}
                    onConfirm={() => deleteItem.mutate(p.id)}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
