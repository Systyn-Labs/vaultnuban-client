export function Customers({ readonly }: { readonly: boolean }) {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-text-primary">Customers</h1>
      <p className="mt-1 text-sm text-text-muted">
        {readonly ? 'Ops read-only — coming in Phase 5' : 'Coming in Phase 4'}
      </p>
    </div>
  )
}
