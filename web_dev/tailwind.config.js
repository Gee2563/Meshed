const defaultTheme = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#15263a",
        slate: "#5f6d80",
        line: "#d7deea",
        mist: "#eef2f7",
        accent: "#cf6a2f",
        accentStrong: "#a94d1f",
      },
      fontFamily: {
        sans: ["Avenir Next", "Segoe UI Variable Text", "Segoe UI", ...defaultTheme.fontFamily.sans],
        display: ["Iowan Old Style", "Palatino Linotype", "Book Antiqua", "Georgia", ...defaultTheme.fontFamily.serif],
      },
      boxShadow: {
        halo: "0 28px 90px rgba(21, 38, 58, 0.14)",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
