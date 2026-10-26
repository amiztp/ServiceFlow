/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: {
      graphite: { DEFAULT: '#22262B', 2: '#2E3238', 800: '#34383F' },
      ink: '#17191C', signal: { DEFAULT: '#F2C230', hover: '#DFAC1D', text: '#6E5600' },
      paper: '#F5F5F3', wash: '#E9EAE7', line: '#E7EAE4', border: '#D9DBD6',
      'text-secondary': '#565D63'
    },
    fontFamily: { body: ['Inter','system-ui','sans-serif'], display: ['Sora','Inter','sans-serif'], mono: ['IBM Plex Mono','monospace'] },
    borderRadius: { docket: '4px' }
  } },
  plugins: []
}
