/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forge: {
          canvas: 'rgb(var(--forge-canvas) / <alpha-value>)',
          surface: 'rgb(var(--forge-surface) / <alpha-value>)',
          soft: 'rgb(var(--forge-soft) / <alpha-value>)',
          hover: 'rgb(var(--forge-hover) / <alpha-value>)',
          text: 'rgb(var(--forge-text) / <alpha-value>)',
          muted: 'rgb(var(--forge-muted) / <alpha-value>)',
          'muted-strong': 'rgb(var(--forge-muted-strong) / <alpha-value>)',
          line: 'rgb(var(--forge-line) / <alpha-value>)',
          'line-soft': 'rgb(var(--forge-line-soft) / <alpha-value>)',
          'line-strong': 'rgb(var(--forge-line-strong) / <alpha-value>)',
          accent: 'rgb(var(--forge-accent) / <alpha-value>)',
          'accent-hover': 'rgb(var(--forge-accent-hover) / <alpha-value>)',
          brand: 'rgb(var(--forge-brand) / <alpha-value>)',
          signal: 'rgb(var(--forge-signal) / <alpha-value>)',
          icon: 'rgb(var(--forge-icon) / <alpha-value>)',
          header: 'rgb(var(--forge-header) / <alpha-value>)',
          input: 'rgb(var(--forge-input) / <alpha-value>)',
          segment: 'rgb(var(--forge-segment) / <alpha-value>)',
          footer: 'rgb(var(--forge-footer) / <alpha-value>)',
          disabled: 'rgb(var(--forge-disabled) / <alpha-value>)',
          scrim: 'rgb(var(--forge-scrim) / <alpha-value>)',
          overlay: 'rgb(var(--forge-overlay) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      boxShadow: {
        panel: 'var(--forge-shadow-panel)',
      },
    },
  },
  plugins: [],
};
