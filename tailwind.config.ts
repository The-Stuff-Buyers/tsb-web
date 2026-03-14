import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#2D2D2D",
          gold: "#F5C518",
          gray: "#9A9A9A",
          white: "#E8E8E8",
          card: "#3A3A3A",
          input: "#1E1E1E",
          error: "#E53E3E",
          warn: "#D69E2E",
        },
      },
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
