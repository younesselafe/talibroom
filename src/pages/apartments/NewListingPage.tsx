import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ImagePlus, Loader2, Home } from 'lucide-react'
import { MOROCCAN_CITIES } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatPrice } from '@/lib/utils'
import { toast } from 'sonner'

export default function NewListingPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    title: '', price: 2000, city: '', rooms: 1, totalSlots: 1, description: '', imageUrl: '',
  })
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const valid = form.title.trim() && form.city && form.price > 0

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return toast.error('Please fill in the title, city and price')
    setSaving(true)
    await new Promise((r) => setTimeout(r, 700))
    toast.success('Your listing is live! 🏡')
    navigate('/my-listings')
  }

  const item = {
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
  }

  return (
    <div className="page-container max-w-2xl">
      <button onClick={() => navigate(-1)} className="btn-ghost mb-4 -ml-3">
        <ArrowLeft size={18} /> Back
      </button>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-2 text-primary-500 mb-1">
          <Home size={20} />
          <span className="text-xs font-bold uppercase tracking-wide">Student listing</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-sand-900 dark:text-white">
          List your apartment
        </h1>
        <p className="text-sand-500 dark:text-sand-400 mt-1">
          Find trustworthy roommates from your own university.
        </p>
      </motion.div>

      <motion.form
        onSubmit={submit}
        initial="initial"
        animate="animate"
        transition={{ staggerChildren: 0.06 }}
        className="space-y-5"
      >
        {/* Image */}
        <motion.div variants={item}>
          <Label className="mb-1.5 block">Cover photo URL</Label>
          <div className="flex gap-3">
            <Input
              value={form.imageUrl}
              onChange={(e) => set('imageUrl', e.target.value)}
              placeholder="https://…  (paste an image link)"
            />
          </div>
          <div className="mt-2 h-40 rounded-xl border-2 border-dashed border-sand-200 dark:border-[#3A3A36] overflow-hidden flex items-center justify-center bg-sand-50 dark:bg-[#2A2A26]">
            {form.imageUrl ? (
              <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center text-sand-400">
                <ImagePlus size={28} className="mx-auto mb-1" />
                <span className="text-xs">Image preview</span>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div variants={item} className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={form.title} onChange={(e) => set('title', e.target.value)}
                 placeholder="e.g. Bright room near Hassan II campus" />
        </motion.div>

        <motion.div variants={item} className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>City</Label>
            <Select value={form.city} onValueChange={(v) => set('city', v)}>
              <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
              <SelectContent>
                {MOROCCAN_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rooms">Number of rooms</Label>
            <Input id="rooms" type="number" min={1} max={10} value={form.rooms}
                   onChange={(e) => set('rooms', Number(e.target.value))} />
          </div>
        </motion.div>

        <motion.div variants={item} className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Monthly price</Label>
            <span className="font-black text-primary-600 dark:text-primary-400">{formatPrice(form.price)}</span>
          </div>
          <input
            type="range" min={500} max={8000} step={100} value={form.price}
            onChange={(e) => set('price', Number(e.target.value))}
            className="w-full accent-primary-500 cursor-pointer"
          />
        </motion.div>

        <motion.div variants={item} className="space-y-1.5">
          <Label htmlFor="slots">Roommate slots available</Label>
          <Input id="slots" type="number" min={1} max={6} value={form.totalSlots}
                 onChange={(e) => set('totalSlots', Number(e.target.value))} />
        </motion.div>

        <motion.div variants={item} className="space-y-1.5">
          <Label htmlFor="desc">Description</Label>
          <Textarea id="desc" value={form.description} onChange={(e) => set('description', e.target.value)}
                    placeholder="Describe the place, the neighbourhood, what's included…" rows={5} />
        </motion.div>

        <motion.div variants={item}>
          <Card className="p-4 bg-primary-50 dark:bg-primary-900/10 border-primary-100 dark:border-primary-900/30">
            <p className="text-xs text-primary-700 dark:text-primary-300">
              Listings from students are marked with a green <strong>Student</strong> badge. Be honest — verified profiles get 3× more inquiries.
            </p>
          </Card>
        </motion.div>

        <motion.div variants={item} whileTap={{ scale: 0.99 }}>
          <Button type="submit" disabled={saving || !valid} className="w-full" size="lg">
            {saving ? <Loader2 size={18} className="animate-spin" /> : 'Publish listing'}
          </Button>
        </motion.div>
      </motion.form>
    </div>
  )
}
