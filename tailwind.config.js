/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Roboto', 'sans-serif'],
      },
      colors: {
        google: {
          blue: '#1a73e8',
          text: '#202124',
          secondary: '#70757a',
          yellow: '#fbbc04',
          yellowLight: '#fff8e1',
          border: '#dfe1e5'
        }
      }
    },
  },
  plugins: [],
}
