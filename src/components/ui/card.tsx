import React from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-2xl border', className)}
      style={{ background: '#1C2638', borderColor: '#1E2D42' }}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: CardProps) {
  return (
    <div
      className={cn('border-b px-5 py-4', className)}
      style={{ borderColor: '#1E2D42' }}
      {...props}
    />
  )
}

export function CardTitle({ className, ...props }: CardProps) {
  return <p className={cn('text-[13.5px] font-semibold text-text-primary', className)} {...props} />
}

export function CardBody({ className, ...props }: CardProps) {
  return <div className={cn('p-5', className)} {...props} />
}
