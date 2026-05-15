import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Heart, MessageCircle, Share2, Image as ImageIcon, Send,
  ShoppingBag, Sparkles, Tag, BadgeCheck,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { MARKETPLACE_CATEGORIES } from '@/types'
import type { Post } from '@/types'
import Avatar from '@/components/shared/Avatar'
import EmptyState from '@/components/shared/EmptyState'
import SkeletonGrid from '@/components/shared/SkeletonCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn, formatRelativeTime } from '@/lib/utils'
import { staggerContainer, staggerItem } from '@/components/ui/motion'
import { toast } from 'sonner'

// ─── Compose box ───────────────────────────────────────────────────────────────

function Composer({ kind }: { kind: 'social' | 'marketplace' }) {
  const me = useAuthStore((s) => s.profile)
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)

  const submit = () => {
    if (!value.trim()) return
    toast.success(kind === 'social' ? 'Post shared with the community 🎉' : 'Item listed on the marketplace 🛍️')
    setValue('')
    setFocused(false)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-4"
    >
      <div className="flex gap-3">
        <Avatar src={me?.avatar_url} name={me?.full_name ?? 'You'} size="md" isPremium={me?.is_premium} />
        <div className="flex-1">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder={kind === 'social'
              ? "What's happening on campus?"
              : 'Selling something? Describe it + your price…'}
            rows={focused ? 3 : 1}
            className="w-full bg-transparent text-sm text-sand-900 dark:text-sand-100 placeholder:text-sand-400 resize-none focus:outline-none transition-all"
          />
          <AnimatePresence>
            {focused && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-between pt-3 mt-1 border-t border-sand-100 dark:border-[#2A2A26]"
              >
                <button className="btn-ghost text-primary-500 text-sm">
                  <ImageIcon size={16} /> Photo
                </button>
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button size="sm" onClick={submit} disabled={!value.trim()}>
                    <Send size={14} /> {kind === 'social' ? 'Post' : 'List item'}
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Feed post ─────────────────────────────────────────────────────────────────

function FeedPost({ post }: { post: Post }) {
  const [liked, setLiked] = useState(post.user_has_liked ?? false)
  const [likes, setLikes] = useState(post.likes_count ?? 0)

  const toggleLike = () => {
    setLiked((v) => {
      setLikes((n) => (v ? n - 1 : n + 1))
      return !v
    })
  }

  return (
    <motion.article variants={staggerItem} className="card p-5">
      <div className="flex items-center gap-3">
        <Avatar src={post.author?.avatar_url} name={post.author?.full_name ?? '?'} size="md"
                isPremium={post.author?.is_premium} />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sand-900 dark:text-white text-sm flex items-center gap-1">
            {post.author?.full_name}
            {post.author?.is_premium && <BadgeCheck size={14} className="text-gold-500" />}
          </p>
          <p className="text-xs text-sand-400">
            {post.author?.city} · {formatRelativeTime(post.created_at)}
          </p>
        </div>
      </div>

      <p className="mt-3 text-sand-700 dark:text-sand-200 text-[15px] leading-relaxed whitespace-pre-line">
        {post.content}
      </p>

      {post.image_url && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 rounded-xl overflow-hidden"
        >
          <img src={post.image_url} alt="" className="w-full max-h-96 object-cover" />
        </motion.div>
      )}

      <div className="mt-4 flex items-center gap-1 border-t border-sand-100 dark:border-[#2A2A26] pt-3">
        <button
          onClick={toggleLike}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors',
            liked ? 'text-primary-500' : 'text-sand-500 hover:bg-sand-100 dark:hover:bg-[#2A2A26]'
          )}
        >
          <motion.span
            animate={liked ? { scale: [1, 1.4, 1] } : { scale: 1 }}
            transition={{ duration: 0.35 }}
          >
            <Heart size={17} fill={liked ? 'currentColor' : 'none'} />
          </motion.span>
          {likes}
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-sand-500 hover:bg-sand-100 dark:hover:bg-[#2A2A26] transition-colors">
          <MessageCircle size={17} /> {post.comments_count ?? 0}
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-sand-500 hover:bg-sand-100 dark:hover:bg-[#2A2A26] transition-colors ml-auto">
          <Share2 size={16} />
        </button>
      </div>
    </motion.article>
  )
}

// ─── Marketplace item ──────────────────────────────────────────────────────────

function MarketItem({ post }: { post: Post }) {
  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -6 }}
      className="card overflow-hidden group"
    >
      <div className="relative h-44 bg-sand-100 dark:bg-[#2A2A26] overflow-hidden">
        {post.image_url ? (
          <motion.img
            src={post.image_url} alt=""
            className="w-full h-full object-cover"
            whileHover={{ scale: 1.08 }}
            transition={{ duration: 0.5 }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sand-300">
            <ShoppingBag size={32} />
          </div>
        )}
        <Badge variant="neutral" className="absolute top-3 left-3 bg-white/95 backdrop-blur">
          <Tag size={10} /> {post.category}
        </Badge>
        {post.is_sold && (
          <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
            <span className="text-white font-black text-lg tracking-wide rotate-[-8deg] border-2 border-white rounded-lg px-4 py-1">
              SOLD
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="text-sand-700 dark:text-sand-200 text-sm leading-snug line-clamp-2">
          {post.content}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar src={post.author?.avatar_url} name={post.author?.full_name ?? '?'} size="xs" />
            <span className="text-xs text-sand-400 truncate">{post.author?.full_name}</span>
          </div>
          <Button
            size="sm"
            variant={post.is_sold ? 'secondary' : 'default'}
            disabled={post.is_sold}
            onClick={() => toast.success('Message sent to the seller ✉️')}
          >
            {post.is_sold ? 'Sold' : "I'm interested"}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CommunityPage() {
  const [tab, setTab]           = useState<'feed' | 'marketplace'>('feed')
  const [category, setCategory] = useState('all')

  const { data: posts, isLoading } = useQuery({ queryKey: ['posts'], queryFn: api.getPosts })

  const feed = useMemo(() => (posts ?? []).filter((p) => p.type === 'social'), [posts])
  const market = useMemo(() => {
    let items = (posts ?? []).filter((p) => p.type === 'marketplace')
    if (category !== 'all') items = items.filter((p) => p.category === category)
    return items
  }, [posts, category])

  return (
    <div className="page-container max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <h1 className="text-2xl sm:text-3xl font-black text-sand-900 dark:text-white tracking-tight">
          Community
        </h1>
        <p className="text-sand-500 dark:text-sand-400 mt-1">
          Campus life, tips & second-hand deals — all from fellow students.
        </p>
      </motion.div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'feed' | 'marketplace')}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="feed" className="flex-1 sm:flex-none">
            <Sparkles size={14} /> Feed
          </TabsTrigger>
          <TabsTrigger value="marketplace" className="flex-1 sm:flex-none">
            <ShoppingBag size={14} /> Marketplace
          </TabsTrigger>
        </TabsList>

        {/* FEED */}
        <TabsContent value="feed">
          <div className="space-y-4">
            <Composer kind="social" />
            {isLoading ? (
              <SkeletonGrid count={3} variant="post" />
            ) : feed.length === 0 ? (
              <EmptyState icon="📭" title="The feed is quiet" description="Be the first to share something." />
            ) : (
              <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4">
                {feed.map((p) => <FeedPost key={p.id} post={p} />)}
              </motion.div>
            )}
          </div>
        </TabsContent>

        {/* MARKETPLACE */}
        <TabsContent value="marketplace">
          <div className="space-y-4">
            <Composer kind="marketplace" />

            {/* Category chips */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
              {['all', ...MARKETPLACE_CATEGORIES].map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    'whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors',
                    category === c
                      ? 'bg-primary-500 text-white'
                      : 'bg-sand-100 dark:bg-[#2A2A26] text-sand-600 dark:text-sand-300 hover:bg-sand-200 dark:hover:bg-[#3A3A36]'
                  )}
                >
                  {c === 'all' ? 'All items' : c}
                </button>
              ))}
            </div>

            {isLoading ? (
              <SkeletonGrid count={4} variant="apartment" />
            ) : market.length === 0 ? (
              <EmptyState icon="🛍️" title="Nothing for sale here" description="Try a different category." />
            ) : (
              <motion.div
                key={category}
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                {market.map((p) => <MarketItem key={p.id} post={p} />)}
              </motion.div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
