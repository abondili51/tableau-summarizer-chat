/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tableau: {
          blue: '#1f77b4',
          orange: '#ff7f0e',
          green: '#2ca02c',
        }
      }
    },
  },
  plugins: [],
}

