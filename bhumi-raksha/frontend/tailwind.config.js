/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        risk: {
          low: '#22c55e',
          moderate: '#eab308',
          high: '#f97316',
          critical: '#ef4444',
        },
        surface: {
          DEFAULT: '#0b1220',
          panel: '#111a2e',
          border: '#1f2b45',
        },
      },
    },
  },
  plugins: [],
};
