/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#090a0f',
        surface: {
          50: '#1e2230',
          100: '#161925',
          200: '#11141e',
          300: '#0d0f17',
          DEFAULT: '#11141e',
        },
        border: {
          light: '#2a3045',
          DEFAULT: '#1e2333',
        },
        primary: {
          50: '#fff0f3',
          100: '#ffe0e6',
          200: '#ffb3c1',
          300: '#ff809b',
          400: '#ff4d6d',
          500: '#ff1a40',
          600: '#e1002b',
          700: '#b30022',
          800: '#8a001a',
          900: '#660014',
          DEFAULT: '#ff1a40',
        },
        accent: {
          red: '#ff1a40',
          crimson: '#e1002b',
          pink: '#ff4d6d',
          emerald: '#10b981',
          violet: '#a855f7',
          amber: '#f59e0b',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
        'red-glow-gradient': 'radial-gradient(circle at 50% 50%, rgba(255, 26, 64, 0.15) 0%, transparent 70%)',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        glow: '0 0 25px -5px rgba(255, 26, 64, 0.45)',
        'glow-red': '0 0 30px -5px rgba(255, 26, 64, 0.55)',
        'glow-subtle': '0 0 15px rgba(255, 26, 64, 0.25)',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: 0.8, transform: 'scale(1)' },
          '50%': { opacity: 0.3, transform: 'scale(1.05)' },
        },
      },
      animation: {
        pulseGlow: 'pulseGlow 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
