import { Skeleton } from '@/components/ui/skeleton'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SkeletonGridProps {
  count?: number
  variant?: 'profile' | 'apartment' | 'post'
  className?: string
}

function ProfileSkeleton() {
  return (
    <div className="card overflow-hidden">
      <Skeleton className="h-20 w-full rounded-none" />
      <div className="px-5 pb-5 -mt-9">
        <Skeleton className="w-14 h-14 rounded-full ring-4 ring-white dark:ring-[#1C1C1A]" />
        <div className="mt-3 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <div className="mt-4 space-y-2">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <div className="mt-4 flex gap-1.5">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="mt-4 h-11 w-full rounded-xl" />
      </div>
    </div>
  )
}

function ApartmentSkeleton() {
  return (
    <div className="card overflow-hidden">
      <Skeleton className="h-44 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex justify-between pt-1">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
    </div>
  )
}

function PostSkeleton() {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

export default function SkeletonGrid({ count = 6, variant = 'profile', className }: SkeletonGridProps) {
  const Item = variant === 'apartment' ? ApartmentSkeleton : variant === 'post' ? PostSkeleton : ProfileSkeleton
  return (
    <div
      className={cn(
        variant === 'post'
          ? 'space-y-4 max-w-xl mx-auto'
          : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4',
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.06 }}
        >
          <Item />
        </motion.div>
      ))}
    </div>
  )
}
