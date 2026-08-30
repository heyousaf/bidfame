import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#faf8f3",
        surface: "#ffffff",
        surfacealt: "#f4f1ea",
        gold: "#b8860b",
        golddeep: "#8a6a12",
        violet: "#6d28d9",
        magenta: "#a21caf",
      },
      fontFamily: {
        display: ["Playfair Display", "serif"],
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
