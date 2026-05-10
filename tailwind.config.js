/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          primary: 'rgb(var(--bg-primary) / <alpha-value>)',
          secondary: 'rgb(var(--bg-secondary) / <alpha-value>)',
          card: 'rgb(var(--bg-card) / <alpha-value>)',
          elevated: 'rgb(var(--bg-elevated) / <alpha-value>)',
        },
        content: {
          primary: 'rgb(var(--content-primary) / <alpha-value>)',
          secondary: 'rgb(var(--content-secondary) / <alpha-value>)',
          muted: 'rgb(var(--content-muted) / <alpha-value>)',
        },
        accent: {
          red: 'rgb(var(--accent-red) / <alpha-value>)',
          crimson: 'rgb(var(--accent-crimson) / <alpha-value>)',
          gold: 'rgb(var(--accent-gold) / <alpha-value>)',
          amber: 'rgb(var(--accent-amber) / <alpha-value>)',
        },
        neon: {
          blue: '#00c8ff',
          purple: '#bf5fff',
          green: '#00ff88',
          orange: '#ff8c00',
          red: '#ff3b5c',
        },
        success: '#00d68f',
        warning: '#ffaa00',
        danger: '#ff3b5c',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'hero-gradient': 'linear-gradient(135deg, #050810 0%, #080d1a 50%, #0d1a2e 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(13,21,38,0.9), rgba(17,28,50,0.7))',
        'blue-glow': 'linear-gradient(135deg, #00aaff20, #7c3aed20)',
        'accent-gradient': 'linear-gradient(135deg, #00aaff, #7c3aed)',
        'success-gradient': 'linear-gradient(135deg, #00d68f, #00aa6d)',
        'danger-gradient': 'linear-gradient(135deg, #ff3b5c, #cc2244)',
      },
      boxShadow: {
        'glow-red': '0 0 20px rgb(var(--accent-red) / 0.3)',
        'glow-gold': '0 0 20px rgb(var(--accent-gold) / 0.3)',
        'card': '0 4px 24px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.05) inset',
        'card-hover': '0 8px 40px rgb(var(--accent-red) / 0.15), 0 1px 0 rgba(255,255,255,0.08) inset',
        'nav': '0 -1px 0 rgba(255,255,255,0.05), 0 -4px 20px rgba(0,0,0,0.5)',
        'input': '0 0 0 1px rgb(var(--accent-red) / 0.3), 0 0 12px rgb(var(--accent-red) / 0.1)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'spin-slow': 'spin 8s linear infinite',
        'bounce-slow': 'bounce 3s infinite',
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0,170,255,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(0,170,255,0.6)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
