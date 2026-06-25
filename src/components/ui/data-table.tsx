import React, { useState } from 'react'
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  emptyMessage?: string
  /** Show the global search bar (default: true) */
  searchable?: boolean
  searchPlaceholder?: string
}

export function DataTable<TData>({
  columns,
  data,
  emptyMessage = 'No records found.',
  searchable = true,
  searchPlaceholder = 'Search…',
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: 'includesString',
  })

  const rowCount = table.getRowModel().rows.length
  const totalCount = data.length
  const filtered = globalFilter.trim().length > 0
  const sorted = sorting.length > 0

  return (
    <div className="flex flex-col">
      {/* ── Toolbar ── */}
      {searchable && (
        <div
          className="flex items-center gap-3 border-b px-6 py-3.5"
          style={{ borderColor: '#1E2D42' }}
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <input
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder={searchPlaceholder}
              className={cn(
                'h-8 w-full rounded-lg border bg-surface-3 pl-8 pr-8 text-[13px] text-text-primary transition-colors',
                'placeholder:text-text-muted',
                'focus:outline-none focus:ring-2 focus:ring-accent',
                globalFilter ? 'border-accent/50' : 'border-border'
              )}
            />
            {globalFilter && (
              <button
                onClick={() => setGlobalFilter('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-muted hover:text-text-primary"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          {/* Row count */}
          <span className="flex-shrink-0 text-[12px] text-text-muted tabular-nums">
            {filtered || sorted
              ? <>{rowCount} <span className="text-text-muted/60">of {totalCount}</span></>
              : <>{totalCount} row{totalCount !== 1 ? 's' : ''}</>
            }
          </span>
          {/* Clear sort pill */}
          {sorted && (
            <button
              onClick={() => setSorting([])}
              className="flex-shrink-0 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent hover:bg-accent/20 transition-colors"
            >
              Clear sort
            </button>
          )}
        </div>
      )}

      {/* ── Table ── */}
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} style={{ borderBottom: '1px solid #1E2D42' }}>
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sorted = header.column.getIsSorted()
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        'px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted first:pl-6 last:pr-6',
                        canSort && 'select-none'
                      )}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          onClick={header.column.getToggleSortingHandler()}
                          className="group inline-flex items-center gap-1.5 hover:text-text-primary transition-colors"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <span className={cn(
                            'transition-colors',
                            sorted ? 'text-accent' : 'text-text-muted/40 group-hover:text-text-muted'
                          )}>
                            {sorted === 'asc'
                              ? <ChevronUp className="h-3 w-3" />
                              : sorted === 'desc'
                              ? <ChevronDown className="h-3 w-3" />
                              : <ChevronsUpDown className="h-3 w-3" />}
                          </span>
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {rowCount === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-[13px] text-text-muted"
                >
                  {filtered
                    ? <>No results for <span className="font-mono text-text-secondary">"{globalFilter}"</span></>
                    : emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, i) => (
                <tr
                  key={row.id}
                  className={cn(
                    'transition-colors hover:bg-[#1C2638]/40',
                    i !== rowCount - 1 && 'border-b border-[#1E2D42]'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-4 py-4 text-[13px] text-text-primary first:pl-6 last:pr-6"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer ── */}
      {rowCount > 0 && (
        <div
          className="flex items-center justify-between border-t px-6 py-3"
          style={{ borderColor: '#1E2D42' }}
        >
          <span className="text-[12px] text-text-muted">
            {filtered
              ? `Showing ${rowCount} of ${totalCount} rows`
              : `${totalCount} total row${totalCount !== 1 ? 's' : ''}`}
          </span>
          {sorted && (
            <span className="text-[12px] text-text-muted">
              Sorted by{' '}
              <span className="font-semibold text-text-secondary">
                {sorting.map(s => s.id).join(', ')}
              </span>
              {' '}
              <span className="text-text-muted/60">
                ({sorting[0]?.desc ? 'desc' : 'asc'})
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/** Card-style row used on mobile when a table would overflow */
export function MobileCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn('rounded-xl border p-4', className)}
      style={{ background: '#111827', borderColor: '#1E2D42' }}
    >
      {children}
    </div>
  )
}
