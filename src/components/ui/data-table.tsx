import React from 'react'
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { cn } from '@/lib/utils'

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  /** Message shown when data is empty */
  emptyMessage?: string
}

export function DataTable<TData>({ columns, data, emptyMessage = 'No records found.' }: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} style={{ borderBottom: '1px solid #1E2D42' }}>
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted first:pl-6 last:pr-6"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-6 py-10 text-center text-[13px] text-text-muted"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row, i) => (
              <tr
                key={row.id}
                className={cn(
                  'transition-colors hover:bg-[#1C2638]/30',
                  i !== table.getRowModel().rows.length - 1 && 'border-b border-[#1E2D42]'
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-4 py-3 text-[13px] text-text-primary first:pl-6 last:pr-6"
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
