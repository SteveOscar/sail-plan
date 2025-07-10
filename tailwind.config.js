/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
      extend: {
        colors: {
          ocean: '#005689',
          wave: '#0077be',
          foam: '#e0f7fa',
        },
      },
    },
    plugins: [],
  };