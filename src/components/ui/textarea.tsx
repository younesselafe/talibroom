import * as React from 'react'
import { cn } from '@/lib/utils'

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[96px] w-full rounded-xl border border-sand-200 dark:border-[#3A3A36]',
        'bg-sand-50 dark:bg-[#2A2A26] px-4 py-3 text-sm resize-none',
        'text-sand-900 dark:text-sand-100 placeholder:text-sand-400 dark:placeholder:text-sand-600',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:border-primary-400',
        'transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'

export { Textarea }
