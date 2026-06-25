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
        'flex flex-col gap-1 border-b px-4 py-4 sm:px-6 sm:py-5 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
      style={{ borderColor: '#1E2D42' }}
    >
      <div>
        <h1 className="text-[17px] font-bold tracking-tight text-text-primary">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[13px] text-text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-shrink-0 items-center gap-2 pt-2 sm:pt-0">{actions}</div>}
    </div>
  )
}
