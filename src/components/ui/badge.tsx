import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-accent/20 text-accent',
        active: 'bg-green-bg text-green-text',
        suspended: 'bg-amber-bg text-amber-text',
        closed: 'bg-surface-2 text-text-muted',
        inactive: 'bg-surface-2 text-text-muted',
        credit: 'bg-green-bg text-green-text',
        debit: 'bg-red-bg text-red-text',
        tier1: 'bg-blue-bg text-blue-text',
        tier2: 'bg-purple-bg text-purple-text',
        tier3: 'bg-green-bg text-green-text',
        dev: 'bg-blue-bg text-blue-text',
        ops: 'bg-green-bg text-green-text',
        both: 'bg-purple-bg text-purple-text',
        unmatched: 'bg-red-bg text-red-text',
        closed_account: 'bg-amber-bg text-amber-text',
        amount_mismatch: 'bg-purple-bg text-purple-text',
        tier_limit: 'bg-blue-bg text-blue-text',
        webhook: 'bg-blue-bg text-blue-text',
        sweep: 'bg-purple-bg text-purple-text',
        manual: 'bg-surface-2 text-text-secondary',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
