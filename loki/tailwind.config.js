/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        loki: {
          bg: 'var(--loki-bg)',
          fg: 'var(--loki-fg)',
          border: 'var(--loki-border)',
          accent: 'var(--loki-accent)',
          sidebar: 'var(--loki-sidebar)',
          block: {
            bg: 'var(--loki-block-bg)',
            hover: 'var(--loki-block-hover)',
            success: 'var(--loki-block-success)',
            error: 'var(--loki-block-error)',
          },
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        ui: ['Inter', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
