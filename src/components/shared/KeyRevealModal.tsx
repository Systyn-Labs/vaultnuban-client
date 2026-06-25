import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/app.store'

interface KeyRevealModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle: string
  apiKey: string
}

export function KeyRevealModal({ open, onClose, title, subtitle, apiKey }: KeyRevealModalProps) {
  const showToast = useAppStore((s) => s.showToast)

  function copyKey() {
    try {
      navigator.clipboard.writeText(apiKey)
    } catch {
      // fallback: no-op
    }
    showToast('API key copied to clipboard')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {/* Warning banner */}
          <div className="rounded-xl border px-4 py-3 text-[12.5px] font-medium" style={{ background: '#FBF6E9', borderColor: '#F0E3C0', color: '#8A6814' }}>
            ⚠ Copy this now — it will never be shown again.
          </div>

          {/* Key + copy button */}
          <div className="flex items-stretch gap-2">
            <code
              className="flex-1 break-all rounded-xl px-4 py-3 font-mono text-[12.5px] leading-relaxed text-text-primary"
              style={{ background: '#0E1525' }}
            >
              {apiKey}
            </code>
            <Button size="sm" onClick={copyKey} className="flex-shrink-0 self-stretch px-4">
              Copy
            </Button>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            I've stored it — done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
