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
        sage: {
          50: "#f2f6ee",
          100: "#deebd4",
          200: "#bad5a9",
          300: "#90ba79",
          400: "#6a9e52",
          500: "#4f7d3a",
          600: "#3c632c",
          700: "#2e4c22",
          800: "#1f3317",
          900: "#101a0c",
        },
        wood: {
          50: "#faf5ee",
          100: "#f0e6d3",
          200: "#ddc9a6",
          300: "#c7a772",
          400: "#b08848",
          500: "#8b6a31",
          600: "#6e5226",
          700: "#523d1c",
          800: "#362813",
          900: "#1b140a",
        },
        cream: {
          DEFAULT: "#FAF7F2",
          50: "#fefcfa",
          100: "#faf7f2",
          200: "#f3ece0",
          300: "#e8dccb",
          400: "#d9c9b0",
          500: "#c5b090",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-playfair)", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
        "card-hover":
          "0 4px 12px 0 rgb(0 0 0 / 0.08), 0 2px 4px -1px rgb(0 0 0 / 0.05)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.35s ease-out",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
