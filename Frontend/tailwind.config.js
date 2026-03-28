/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          navy: {
            900: '#0A192F',
            800: '#112240',
            700: '#233554',
          },
          teal: {
            DEFAULT: '#2EC4B6',
            hover: '#249C91',
            light: '#64FFDA',
          },
          white: {
            DEFAULT: '#FFFFFF',
            muted: '#CCD6F6',
            darker: '#8892B0',
          }
        },
        fontFamily: {
          sans: ['Inter', 'Poppins', 'sans-serif'],
        }
      },
    },
    plugins: [],
  }
