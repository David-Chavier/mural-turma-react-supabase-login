/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        primaria: '#6366f1',
        secundaria: '#e0e7ff',
      },
    },
  },
  plugins: [],
}
