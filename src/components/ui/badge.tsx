import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default:  'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
        gold:     'bg-gold-400/20 text-gold-600 dark:text-gold-400',
        green:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
        neutral:  'bg-sand-100 text-sand-600 dark:bg-[#2A2A26] dark:text-sand-300',
        outline:  'border border-sand-200 dark:border-[#3A3A36] text-sand-600 dark:text-sand-300',
        blue:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
