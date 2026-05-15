import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 disabled:pointer-events-none disabled:opacity-50 select-none',
  {
    variants: {
      variant: {
        default:     'bg-primary-500 text-white shadow-primary hover:bg-primary-600 hover:shadow-none',
        secondary:   'bg-sand-100 dark:bg-[#2A2A26] text-sand-800 dark:text-sand-200 hover:bg-sand-200 dark:hover:bg-[#3A3A36]',
        outline:     'border border-sand-200 dark:border-[#3A3A36] bg-transparent text-sand-700 dark:text-sand-200 hover:bg-sand-100 dark:hover:bg-[#2A2A26]',
        ghost:       'text-sand-600 dark:text-sand-300 hover:bg-sand-100 dark:hover:bg-[#2A2A26]',
        destructive: 'bg-red-500 text-white hover:bg-red-600',
        gold:        'bg-gold-500 text-white hover:bg-gold-600',
        link:        'text-primary-500 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-5 py-2.5',
        sm:      'h-9 px-3.5 text-xs',
        lg:      'h-12 px-7 text-base',
        icon:    'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
