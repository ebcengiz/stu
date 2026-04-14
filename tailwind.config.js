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
          50: '#eef5f2',
          100: '#d5e8e0',
          200: '#b0d4c4',
          300: '#85bea5',
          400: '#5ea88a',
          500: '#4a9175',
          600: '#3d7a63',
          700: '#336452',
          800: '#2b5043',
          900: '#234136',
        },
        background: '#f0f5f2',
        foreground: '#2d3a35',
      },
    },
  },
  plugins: [],
}
