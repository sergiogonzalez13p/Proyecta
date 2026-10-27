/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: { ink: '#111310', panel: '#171914', lime: '#C7F36B', muted: '#A4A69E', line: '#292C25' },
      fontFamily: { display: ['Space Grotesk', 'sans-serif'], sans: ['Inter', 'sans-serif'] },
      boxShadow: { glow: '0 0 48px rgba(199,243,107,.12)' },
    },
  },
  plugins: [],
};
