import * as React from 'react'
import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/app.store'

export function Toaster() {
  const toast = useAppStore((s) => s.toast)
  const clearToast = useAppStore((s) => s.clearToast)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(clearToast, 3400)
    return () => clearTimeout(t)
  }, [toast, clearToast])

  return (
    <div
      aria-live="polite"
      className={cn(
        'fixed bottom-4 left-1/2 z-[100] -translate-x-1/2 transition-all duration-300',
        toast ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
      )}
    >
      <div className="flex items-center gap-3 rounded-lg bg-surface-3 border border-border px-4 py-3 shadow-modal text-sm text-text-primary max-w-sm">
        <span className="flex-1">{toast}</span>
        <button onClick={clearToast} className="text-text-muted hover:text-text-primary">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
