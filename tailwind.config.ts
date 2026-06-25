import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Design system tokens from the VaultNUBAN design
        canvas: '#0E1525',
        surface: '#111827',
        'surface-2': '#1C2638',
        'surface-3': '#243044',
        border: '#1E2D42',
        'border-subtle': '#2A3A52',
        accent: '#4338CA',
        'accent-hover': '#3730A3',
        'text-primary': '#E7EBF2',
        'text-secondary': '#9BA6B8',
        'text-muted': '#6B7689',
        // Status colors
        'green-bg': '#E3F4EE',
        'green-text': '#0E7A5A',
        'red-bg': '#FCEBEA',
        'red-text': '#B42318',
        'amber-bg': '#FEF3C7',
        'amber-text': '#92400E',
        'blue-bg': '#E5EDFF',
        'blue-text': '#2657D6',
        'purple-bg': '#F0E9FF',
        'purple-text': '#6B3FD0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        lg: '10px',
        md: '8px',
        sm: '6px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
        modal: '0 20px 60px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
}

export default config
