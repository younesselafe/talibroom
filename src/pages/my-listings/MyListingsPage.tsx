import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, MapPin, BedDouble, Eye, Pencil, Trash2, ShoppingBag } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import EmptyState from '@/components/shared/EmptyState'
import SkeletonGrid from '@/components/shared/SkeletonCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { formatPrice, formatRelativeTime } from '@/lib/utils'
import { staggerContainer, staggerItem } from '@/components/ui/motion'
import { toast } from 'sonner'

export default function MyListingsPage() {
  const navigate = useNavigate()
  const me = useAuthStore((s) => s.profile)

  const { data: apartments, isLoading: aptLoading } = useQuery({
    queryKey: ['apartments'], queryFn: api.getApartments,
  })
  const { data: posts, isLoading: postLoading } = useQuery({
    queryKey: ['posts'], queryFn: api.getPosts,
  })

  const myApartments = (apartments ?? []).filter((a) => a.student_owner_id === me?.id)
  const myItems = (posts ?? []).filter((p) => p.type === 'marketplace' && p.user_id === me?.id)

  return (
    <div className="page-container max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-sand-900 dark:text-white tracking-tight">
            My listings
          </h1>
          <p className="text-sand-500 dark:text-sand-400 mt-1">Manage your apartments and items for sale.</p>
        </div>
        <Button onClick={() => navigate('/apartments/new')}><Plus size={17} /> New</Button>
      </motion.div>

      <Tabs defaultValue="apartments">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="apartments" className="flex-1 sm:flex-none">Apartments</TabsTrigger>
          <TabsTrigger value="marketplace" className="flex-1 sm:flex-none">Marketplace</TabsTrigger>
        </TabsList>

        {/* Apartments */}
        <TabsContent value="apartments">
          {aptLoading ? (
            <SkeletonGrid count={2} variant="apartment" className="sm:grid-cols-2 lg:grid-cols-2" />
          ) : myApartments.length === 0 ? (
            <EmptyState icon="🏠" title="No apartments listed"
              description="List a room or apartment and start receiving inquiries."
              action={<Button onClick={() => navigate('/apartments/new')}><Plus size={16} /> Create listing</Button>} />
          ) : (
            <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
              {myApartments.map((a) => (
                <motion.div key={a.id} variants={staggerItem} className="card p-3 flex gap-3 items-center">
                  <img src={a.image_url ?? ''} alt="" className="w-24 h-20 rounded-xl object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sand-900 dark:text-white text-sm truncate">{a.title}</p>
                    <p className="text-xs text-sand-400 flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-1"><MapPin size={11} />{a.city}</span>
                      <span className="flex items-center gap-1"><BedDouble size={11} />{a.rooms}</span>
                    </p>
                    <p className="text-sm font-black text-primary-600 dark:text-primary-400 mt-1">
                      {formatPrice(a.price)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Button size="icon" variant="outline" onClick={() => navigate(`/apartments/${a.id}`)}>
                      <Eye size={15} />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => toast('Edit coming soon')}>
                      <Pencil size={15} />
                    </Button>
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
            <EmptyState icon="🛍️" title="Nothing listed for sale"
              description="Sell your old books, electronics or furniture to other students."
              action={<Button onClick={() => navigate('/community')}><ShoppingBag size={16} /> Go to Marketplace</Button>} />
          ) : (
            <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
              {myItems.map((p) => (
                <motion.div key={p.id} variants={staggerItem} className="card p-3 flex gap-3 items-center">
                  {p.image_url && (
                    <img src={p.image_url} alt="" className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sand-700 dark:text-sand-200 text-sm line-clamp-2">{p.content}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="neutral">{p.category}</Badge>
                      {p.is_sold && <Badge variant="green">Sold</Badge>}
                      <span className="text-[11px] text-sand-400">{formatRelativeTime(p.created_at)}</span>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => toast('Item removed')}>
                    <Trash2 size={15} className="text-red-500" />
                  </Button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
