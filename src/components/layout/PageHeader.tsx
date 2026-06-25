import React from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  subtitle?: string
  /** Slot for action buttons (Provision, Create key, etc.) */
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 border-b px-6 py-6 sm:px-8 sm:py-7 sm:flex-row sm:items-start sm:justify-between',
        className
      )}
      style={{ borderColor: '#1E2D42' }}
    >
      <div>
        <h1 className="text-[18px] font-bold tracking-tight text-text-primary">{title}</h1>
        {subtitle && <p className="mt-1 text-[13.5px] leading-relaxed text-text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-shrink-0 items-center gap-2 pt-3 sm:pt-0.5">{actions}</div>}
    </div>
  )
}
