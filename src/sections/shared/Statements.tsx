import { PageHeader } from '@/components/layout/PageHeader'
import { SectionLayout } from '@/components/layout/SectionLayout'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/app.store'

export function Statements() {
  const showToast = useAppStore((s) => s.showToast)

  return (
    <SectionLayout noPadding>
      <PageHeader
        title="Statements"
        subtitle="Account statement with running balance — export to CSV"
        actions={
          <Button variant="outline" size="sm" onClick={() => showToast('Statement exported to CSV')}>
            Export CSV
          </Button>
        }
      />
      <div className="p-6">
        <ComingSoon phase={4} />
      </div>
    </SectionLayout>
  )
}

function ComingSoon({ phase }: { phase: number }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border py-20 text-center" style={{ borderColor: '#1E2D42', borderStyle: 'dashed' }}>
      <p className="text-sm font-semibold text-text-secondary">Building in Phase {phase}</p>
      <p className="mt-1 text-xs text-text-muted">Full implementation coming up next</p>
    </div>
  )
}
