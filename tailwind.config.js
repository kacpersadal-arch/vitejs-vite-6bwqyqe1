/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0f172a', // Główne tło
          800: '#1e293b', // Karty
          700: '#334155', // Obramowania
        },
        neon: {
          green: '#10b981', // Wygrana
          red: '#ef4444', // Przegrana
          blue: '#3b82f6', // Akcent
          purple: '#8b5cf6', // Specjalne
        },
      },
    },
  },
  plugins: [],
};
