import { PageHeader } from '@/components/layout/PageHeader'
import { SectionLayout } from '@/components/layout/SectionLayout'

export function CrossTenantSuspense() {
  return (
    <SectionLayout noPadding>
      <PageHeader
        title="Cross-tenant Suspense"
        subtitle="Rolled-up view of unresolved suspense items across all tenants"
      />
      <div className="p-6">
        <ComingSoon phase={3} />
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
