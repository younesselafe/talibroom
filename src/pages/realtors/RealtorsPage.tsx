import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BadgeCheck, MapPin, Phone, Building2, Home, ShieldCheck } from 'lucide-react'
import { api } from '@/lib/api'
import { MOROCCAN_CITIES } from '@/types'
import Avatar from '@/components/shared/Avatar'
import EmptyState from '@/components/shared/EmptyState'
import SkeletonGrid from '@/components/shared/SkeletonCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { staggerContainer, staggerItem } from '@/components/ui/motion'
import { toast } from 'sonner'

export default function RealtorsPage() {
  const [city, setCity] = useState('all')
  const { data: realtors, isLoading } = useQuery({ queryKey: ['realtors'], queryFn: api.getRealtors })

  const filtered = useMemo(() => {
    let list = realtors ?? []
    if (city !== 'all') list = list.filter((r) => r.city === city)
    return [...list].sort((a, b) => Number(b.verified) - Number(a.verified))
  }, [realtors, city])

  return (
    <div className="page-container max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <h1 className="text-2xl sm:text-3xl font-black text-sand-900 dark:text-white tracking-tight">
          Verified realtors
        </h1>
        <p className="text-sand-500 dark:text-sand-400 mt-1">
          Trusted agents — every verified profile is checked by the MoRoom team.
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
                  className="mb-6 w-48">
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cities</SelectItem>
            {MOROCCAN_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </motion.div>

      {isLoading ? (
        <SkeletonGrid count={4} variant="profile" />
      ) : filtered.length === 0 ? (
        <EmptyState icon="🏢" title="No realtors in this city yet" />
      ) : (
        <motion.div variants={staggerContainer} initial="initial" animate="animate"
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((r) => (
            <motion.div key={r.id} variants={staggerItem} whileHover={{ y: -4 }}
                        className="card p-5">
              <div className="flex items-start gap-3">
                <Avatar src={r.avatar_url} name={r.full_name} size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sand-900 dark:text-white flex items-center gap-1">
                    {r.full_name}
                    {r.verified && <BadgeCheck size={16} className="text-blue-500" />}
                  </p>
                  <p className="text-xs text-sand-400 flex items-center gap-1 mt-0.5">
                    <Building2 size={12} /> {r.agency_name ?? 'Independent agent'}
                  </p>
                  <p className="text-xs text-sand-400 flex items-center gap-1 mt-0.5">
                    <MapPin size={12} /> {r.city}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <Badge variant={r.verified ? 'green' : 'neutral'}>
                  {r.verified ? <><ShieldCheck size={11} /> Verified</> : 'Unverified'}
                </Badge>
                <Badge variant="neutral"><Home size={11} /> {r.listing_count ?? 0} listings</Badge>
              </div>

              <div className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1"
                        onClick={() => toast(`Call ${r.phone}`)}>
                  <Phone size={15} /> Call
                </Button>
                <Button className="flex-1"
                        onClick={() => toast.success(`Message sent to ${r.full_name.split(' ')[0]}`)}>
                  Contact
                </Button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
