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
        // Terracotta primary — "Mint Souk" warm clay
        primary: {
          50:  '#FDF1EC',
          100: '#FBE0D5',
          200: '#F6C2AE',
          300: '#EF9E83',
          400: '#E97A5C',
          500: '#E15B3D', // main
          600: '#C5462B',
          700: '#A1351F',
          800: '#7C2818',
          900: '#561C12',
          950: '#321009',
        },
        // Jade mint — soft-tech accent
        mint: {
          50:  '#ECFAF5',
          100: '#D2F4E8',
          200: '#A8E8D3',
          300: '#71D7B9',
          400: '#49C9A4',
          500: '#34BD98', // main
          600: '#239B7C',
          700: '#1C7B63',
          800: '#175F4E',
          900: '#134B3F',
          950: '#082C24',
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
        // Accent: warm honey
        gold: {
          100: '#FCEFD2',
          200: '#F8DCA5',
          300: '#F4C878',
          400: '#F1BC5C',
          500: '#EFB048',
          600: '#D4912A',
          700: '#A86F20',
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
        'primary':  '0 6px 24px 0 rgba(225,91,61,0.35)',
        'mint':     '0 6px 24px 0 rgba(52,189,152,0.32)',
        'glow':     '0 0 40px 0 rgba(225,91,61,0.16)',
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
        'hero-gradient': 'linear-gradient(135deg, #C5462B 0%, #8A2E1A 52%, #2A130B 100%)',
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
