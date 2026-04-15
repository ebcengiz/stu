/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef3f0',
          100: '#d6e2db',
          200: '#b3ccbe',
          300: '#8db3a0',
          400: '#739c84',
          500: '#5D866C',
          600: '#4b6b57',
          700: '#3d5847',
          800: '#314839',
          900: '#283b2f',
        },
        background: '#F5F5F0',
        foreground: '#2d332f',
      },
    },
  },
  plugins: [],
}
