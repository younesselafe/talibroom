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
        // Teal primary (Material 3)
        primary: {
          50:  '#E4FFFB',
          100: '#C1F9F3',
          200: '#89F5E7',
          300: '#6BD8CB',
          400: '#008378', // primary-container
          500: '#00685F', // main
          600: '#005A52',
          700: '#00443F',
          800: '#00332F',
          900: '#00211E',
          950: '#00120F',
        },
        // Cool teal-grey neutrals (background system)
        sand: {
          50:  '#F0FBF9',
          100: '#E2F1EF',
          200: '#D1E5E2',
          300: '#BCC9C6', // outline-variant
          400: '#9DAAA7',
          500: '#6D7A77', // outline
          600: '#525E5C',
          700: '#3D4947', // on-surface-variant
          800: '#27302E',
          900: '#00201E', // on-background
          950: '#00110F',
        },
        // Accent: warm amber (Material 3 secondary)
        gold: {
          400: '#FBBF24', // main accent
          500: '#F4B500',
          600: '#7A5A00', // text on light amber
          700: '#5C4300', // text on solid amber (AA contrast)
        },
        // Fresh green accent (online / success highlights)
        mint: {
          100: '#D1F5E8',
          300: '#7FDCBE',
          400: '#4ECDA0',
          500: '#2DB888',
          600: '#1B9E73',
          700: '#14795A',
        },
        // Semantic colours
        surface: {
          DEFAULT: '#FFFFFF',
          dark:    '#16201E',
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
        'card':     '0 2px 12px 0 rgba(0,55,52,0.06), 0 1px 3px 0 rgba(0,55,52,0.04)',
        'card-md':  '0 4px 24px 0 rgba(0,55,52,0.10), 0 2px 6px 0 rgba(0,55,52,0.05)',
        'card-lg':  '0 8px 40px 0 rgba(0,55,52,0.14), 0 4px 12px 0 rgba(0,55,52,0.07)',
        'primary':  '0 4px 20px 0 rgba(0,104,95,0.32)',
        'gold':     '0 4px 20px 0 rgba(251,191,36,0.40)',
        'glow':     '0 0 40px 0 rgba(0,104,95,0.18)',
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
        'hero-gradient': 'linear-gradient(135deg, #00685F 0%, #00443F 50%, #00211E 100%)',
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
