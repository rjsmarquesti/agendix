/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        app:        'var(--bg)',
        surface:    'var(--surface)',
        s2:         'var(--s2)',
        s3:         'var(--s3)',
        accent:     'var(--g)',
        'accent-h': 'var(--g-hv)',
        tx:         'var(--tx)',
        'tx-md':    'var(--tx-md)',
        mt:         'var(--mt)',
        'mt-lt':    'var(--mt-lt)',
        bd:         'var(--bd)',
        'bd-md':    'var(--bd-md)',
        'bd-lg':    'var(--bd-lg)',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      borderRadius: {
        xl2: '16px',
        xl3: '20px',
      },
    },
  },
  plugins: [],
};
