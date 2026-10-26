import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#1C1C1C',
        surface: '#2A2A2A',
        'surface-2': '#222222',
        'surface-3': '#1E1E1E',
        'surface-4': '#141414',
        border: '#3A3A3A',
        'border-2': '#2F2F2F',
        text: '#E8E8E8',
        muted: '#8A8A8A',
        accent: '#F0EDE8',
        'accent-hover': '#E8E4DC',
        positive: '#4CAF7D',
        warning: '#E8A838',
        critical: '#E85D4A',
        'code-bg': '#252525',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
      },
      animation: { 'fade-in': 'fade-in 200ms ease-out' },
    },
  },
  plugins: [],
} satisfies Config;
