import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── ACE Brand Colors (Rich Green Theme) ───────────────
        brand: {
          primary: '#336659', // Teal — primary CTA, active nav, links, charts
          hover:   '#1f493d', // Dark Teal — Hover state for primary
          ai:      '#6B8F71', // Fern — AI Intelligence ONLY
          cream:   '#f3efe8', // Warm Cream — Sidebar bg
          sage:    '#E3EFD3', // Pale Sage — Light tint for active nav bg
          light:   'rgba(51, 102, 89, 0.08)', // Very subtle teal tint for hovers
        },
        // ── Neutral Scale (Charcoal/Asparagus based) ──────────
        neutral: {
          50:  '#faf9f6', // Page bg (lightest warm neutral)
          100: '#f3efe8', // Warm cream
          200: '#e8e4db', // Subtle borders
          300: '#dcd9d9',
          400: '#AEC3B0', // Sage (muted borders/icons)
          500: '#6B8F71', // Fern (muted text)
          600: '#4E6243', // Asparagus (secondary text)
          700: '#3d3d3d', // Charcoal (primary text)
          800: '#18291E', // Dark Forest (dark mode surface)
          900: '#0D2B1D', // Deep Jungle (dark mode bg)
        },
        // ── Semantic ──────────────────────────────────────────
        success: { DEFAULT: '#16A34A', light: '#F0FDF4', border: '#BBF7D0' },
        warning: { DEFAULT: '#D97706', light: '#FFFBEB', border: '#FDE68A' },
        danger:  { DEFAULT: '#DC2626', light: '#FEF2F2', border: '#FECACA' },
        // ── Light Mode Surfaces (CSS var-driven) ──────────────
        surface: {
          DEFAULT: 'var(--surface)',
          secondary: 'var(--surface-secondary)',
          elevated: 'var(--surface-elevated)',
          border: 'var(--border)',
          'border-subtle': 'var(--border-subtle)',
        },
        text: {
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted:     'var(--text-muted)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['12px', { lineHeight: '16px', letterSpacing: '0.04em' }],
        xs:    ['14px', { lineHeight: '20px', letterSpacing: '0.01em' }],
        sm:    ['15px', { lineHeight: '22px' }],
        base:  ['16px', { lineHeight: '24px' }],
        md:    ['18px', { lineHeight: '26px' }],
        lg:    ['20px', { lineHeight: '28px', letterSpacing: '-0.01em' }],
        xl:    ['22px', { lineHeight: '30px', letterSpacing: '-0.01em' }],
        '2xl': ['24px', { lineHeight: '32px', letterSpacing: '-0.02em' }],
        '3xl': ['28px', { lineHeight: '36px', letterSpacing: '-0.02em' }],
        '4xl': ['32px', { lineHeight: '40px', letterSpacing: '-0.03em' }],
        '5xl': ['36px', { lineHeight: '44px', letterSpacing: '-0.03em' }],
        metric:['40px', { lineHeight: '48px', letterSpacing: '-0.03em' }],
      },
      borderRadius: {
        sm:      '6px',
        DEFAULT: '8px',
        md:      '10px',
        lg:      '12px',
        xl:      '16px',
        '2xl':   '24px',
      },
      boxShadow: {
        // Premium, very soft shadows. No harsh dark boxes.
        card:     '0 2px 8px -2px rgba(61, 61, 61, 0.05), 0 1px 2px -1px rgba(61, 61, 61, 0.02)',
        elevated: '0 10px 24px -4px rgba(61, 61, 61, 0.08), 0 4px 10px -2px rgba(61, 61, 61, 0.04)',
        dropdown: '0 12px 32px -4px rgba(61, 61, 61, 0.12), 0 4px 12px -2px rgba(61, 61, 61, 0.06)',
        focus:    '0 0 0 3px rgba(51, 102, 89, 0.15)',
      },
      spacing: {
        4.5: '18px',
        13:  '52px',
        18:  '72px',
      },
      animation: {
        'fade-in':   'fadeIn 0.2s ease-out',
        'slide-up':  'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'shimmer':   'shimmer 1.5s infinite',
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:   { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:  { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        shimmer:  { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        pulseDot: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
      },
    },
  },
  plugins: [],
}

export default config
