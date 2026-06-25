import { Sidebar } from './Sidebar'
import { Toaster } from '@/components/ui/toast'
import { useAppStore } from '@/store/app.store'

// Section views — admin
import { GlobalHealth } from '@/sections/admin/GlobalHealth'
import { Tenants } from '@/sections/admin/Tenants'
import { CrossTenantSuspense } from '@/sections/admin/CrossTenantSuspense'
// Section views — dev
import { VirtualAccounts } from '@/sections/dev/VirtualAccounts'
import { Customers } from '@/sections/shared/Customers'
import { Transactions } from '@/sections/dev/Transactions'
import { Statements } from '@/sections/shared/Statements'
import { ApiKeys } from '@/sections/dev/ApiKeys'
// Section views — ops
import { SuspenseQueue } from '@/sections/ops/SuspenseQueue'
import { AuditLog } from '@/sections/ops/AuditLog'

function SectionContent() {
  const { section, role } = useAppStore()

  // Admin
  if (role === 'admin' && section === 'health') return <GlobalHealth />
  if (role === 'admin' && section === 'tenants') return <Tenants />
  if (role === 'admin' && section === 'xsuspense') return <CrossTenantSuspense />

  // Dev
  if (role === 'dev' && section === 'accounts') return <VirtualAccounts />
  if (role === 'dev' && section === 'customers') return <Customers readonly={false} />
  if (role === 'dev' && section === 'transactions') return <Transactions />
  if (role === 'dev' && section === 'statements') return <Statements />
  if (role === 'dev' && section === 'keys') return <ApiKeys />

  // Ops
  if (role === 'ops' && section === 'suspense') return <SuspenseQueue />
  if (role === 'ops' && section === 'opscustomers') return <Customers readonly={true} />
  if (role === 'ops' && section === 'opsstatements') return <Statements />
  if (role === 'ops' && section === 'audit') return <AuditLog />

  return null
}

export function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {/* Mobile top padding for hamburger */}
        <div className="pt-16 lg:pt-0">
          <SectionContent />
        </div>
      </main>
      <Toaster />
    </div>
  )
}
