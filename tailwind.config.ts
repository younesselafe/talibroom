import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Terracotta primary
        primary: {
          50:  '#FDF3F0',
          100: '#FAE3DB',
          200: '#F5C5B4',
          300: '#EDA287',
          400: '#E27A5A',
          500: '#C4533A', // main
          600: '#A33D27',
          700: '#822C19',
          800: '#621D0E',
          900: '#3E1007',
          950: '#210805',
        },
        // Warm neutrals (background system)
        sand: {
          50:  '#FAFAF8',
          100: '#F5F5F1',
          200: '#EEEEE9',
          300: '#E2E2DB',
          400: '#C8C8BE',
          500: '#A8A89C',
          600: '#7A7A6E',
          700: '#5A5A50',
          800: '#3A3A32',
          900: '#1E1E18',
          950: '#0D0D0A',
        },
        // Accent: soft gold
        gold: {
          400: '#F5C842',
          500: '#D4A843',
          600: '#B08930',
        },
        // Semantic colours
        surface: {
          DEFAULT: '#FFFFFF',
          dark:    '#1C1C1A',
        },
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
      },
      boxShadow: {
        'card':     '0 2px 12px 0 rgba(0,0,0,0.06), 0 1px 3px 0 rgba(0,0,0,0.04)',
        'card-md':  '0 4px 24px 0 rgba(0,0,0,0.08), 0 2px 6px 0 rgba(0,0,0,0.04)',
        'card-lg':  '0 8px 40px 0 rgba(0,0,0,0.12), 0 4px 12px 0 rgba(0,0,0,0.06)',
        'primary':  '0 4px 20px 0 rgba(196,83,58,0.35)',
        'glow':     '0 0 40px 0 rgba(196,83,58,0.15)',
      },
      animation: {
        'fade-in':       'fadeIn 0.4s ease-out forwards',
        'slide-up':      'slideUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        'slide-in-right':'slideInRight 0.35s cubic-bezier(0.16,1,0.3,1) forwards',
        'scale-in':      'scaleIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards',
        'shimmer':       'shimmer 1.8s infinite linear',
        'pulse-soft':    'pulseSoft 2.5s ease-in-out infinite',
        'float':         'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:        { from: { opacity: '0' },                to: { opacity: '1' } },
        slideUp:       { from: { opacity: '0', transform: 'translateY(24px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideInRight:  { from: { opacity: '0', transform: 'translateX(24px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        scaleIn:       { from: { opacity: '0', transform: 'scale(0.92)' }, to: { opacity: '1', transform: 'scale(1)' } },
        shimmer:       { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        pulseSoft:     { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
        float:         { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
      },
      backgroundImage: {
        'shimmer-gradient': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
        'hero-gradient': 'linear-gradient(135deg, #C4533A 0%, #A33D27 50%, #3A1A10 100%)',
        'card-gradient': 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.75) 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}

export default config
