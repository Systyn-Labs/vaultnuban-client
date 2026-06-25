import { cn } from '@/lib/utils'

interface FilterOption {
  key: string
  label: string
}

interface FilterBarProps {
  options: FilterOption[]
  value: string
  onChange: (key: string) => void
}

export function FilterBar({ options, value, onChange }: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value === opt.key
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className={cn(
              'rounded-full border px-3 py-[5px] text-[12.5px] font-semibold transition-colors',
              active
                ? 'border-[#11151C] bg-[#11151C] text-white'
                : 'border-[#DCE0E6] bg-transparent text-[#5B6573] hover:border-text-muted hover:text-text-secondary'
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
