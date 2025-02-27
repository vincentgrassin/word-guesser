/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary : 'var(--color-primary)',
        yellow : 'var(--color-yellow)',
        orange : 'var(--color-orange)',
        red : 'var(--color-red)',
        secondary : 'var(--color-secondary)',
        light : 'var(--color-light)',
        background: 'var(--color-background)',
        borderPrimary: 'var(--color-border)',
        borderHover: 'var(--color-border-hover)',
        heading: 'var(--color-heading)',
        text: 'var(--color-text)',
      },
    },
  },
  plugins: [],
}
