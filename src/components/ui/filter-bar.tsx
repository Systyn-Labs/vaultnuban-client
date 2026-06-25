import { cn } from '@/lib/utils'

interface FilterBarProps {
  options: string[]
  active: string
  onChange: (value: string) => void
}

export function FilterBar({ options, active, onChange }: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={cn(
            'rounded-full border px-3 py-[5px] text-[12.5px] font-semibold transition-colors capitalize',
            active === opt
              ? 'border-accent bg-accent text-white'
              : 'border-border-subtle bg-transparent text-text-muted hover:border-text-secondary hover:text-text-secondary'
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}
