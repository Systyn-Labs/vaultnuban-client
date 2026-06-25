import React from 'react'
import { cn } from '@/lib/utils'

interface SectionLayoutProps {
  children: React.ReactNode
  /** Extra class on the outer wrapper */
  className?: string
  /** Remove default inner padding (e.g. when a table fills the full width) */
  noPadding?: boolean
}

/**
 * Consistent wrapper for every dashboard section — sets max-width, padding,
 * and scroll container so pages feel uniform.
 */
export function SectionLayout({ children, className, noPadding }: SectionLayoutProps) {
  return (
    <div className={cn('flex flex-col h-full section-enter', className)}>
      {noPadding ? (
        children
      ) : (
        <div className="px-6 py-6 sm:px-8 sm:py-8">{children}</div>
      )}
    </div>
  )
}
