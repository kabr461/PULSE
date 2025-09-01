/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2F1B66", // deep purple
        accent: "#FF4F36",  // bright orange
        sidebar: "#2F1B66",
      },
      fontFamily: {
        display: ["Teko", "sans-serif"],
        sans: ["Lato", "sans-serif"],
      },
    },
  },
  plugins: [],
};
