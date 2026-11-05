import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm "ink on scoresheet" palette
        ink: {
          950: "#0f0e0c",
          900: "#171512",
          850: "#1d1a17",
          800: "#25221e",
          700: "#34302a",
          600: "#4a443c",
        },
        paper: {
          100: "#ece6d9",
          200: "#d6cebf",
          300: "#b9b0a1",
          400: "#958b7c",
        },
        signal: {
          DEFAULT: "#ff5b2e",
          soft: "#ff7a52",
          deep: "#c93d17",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
