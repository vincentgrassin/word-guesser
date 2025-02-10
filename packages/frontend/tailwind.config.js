/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--color-background)',
        backgroundSoft: 'var(--color-background-soft)',
        backgroundMute: 'var(--color-background-mute)',
        border: 'var(--color-border)',
        borderHover: 'var(--color-border-hover)',
        heading: 'var(--color-heading)',
        text: 'var(--color-text)',
      },
    },
  },
  plugins: [],
}
