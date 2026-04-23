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
          50: "#f3f7f0",
          100: "#e2ecd9",
          200: "#c3d9b1",
          300: "#9cc186",
          400: "#77a660",
          500: "#5a8946",
          600: "#466d36",
          700: "#36532a",
          800: "#233620",
          900: "#111b10",
        },
        gold: {
          50: "#faf4e8",
          100: "#f3e6c7",
          200: "#e6cc92",
          300: "#d6b062",
          400: "#c9a158",
          500: "#b78a3a",
          600: "#947028",
          700: "#6f541e",
          800: "#4a3814",
          900: "#241b0a",
        },
        ink: {
          50: "#f7f8fa",
          100: "#eef1f5",
          200: "#dde3ec",
          300: "#c2ccda",
          400: "#8d98ab",
          500: "#64708a",
          600: "#47536a",
          700: "#2f384a",
          800: "#1b2233",
          900: "#0f172a",
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
          DEFAULT: "#FBF8F2",
          50: "#fefcfa",
          100: "#fbf8f2",
          200: "#f3ece0",
          300: "#e8dccb",
          400: "#d9c9b0",
          500: "#c5b090",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-manrope)", "var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl2: "14px",
        xl3: "18px",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(15 23 42 / 0.05), 0 1px 2px -1px rgb(15 23 42 / 0.04)",
        "card-hover":
          "0 10px 28px -12px rgb(15 23 42 / 0.18), 0 4px 10px -4px rgb(15 23 42 / 0.08)",
        soft: "0 2px 6px -2px rgb(15 23 42 / 0.06), 0 8px 24px -12px rgb(15 23 42 / 0.08)",
        "soft-hover":
          "0 12px 32px -14px rgb(15 23 42 / 0.18), 0 6px 14px -6px rgb(15 23 42 / 0.08)",
        "ring-gold": "0 0 0 3px rgb(230 204 146 / 0.45)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.35s ease-out",
        "slide-in-left": "slideInLeft 0.25s ease-out",
        "slide-in-right": "slideInRight 0.25s ease-out",
        "step-fade": "stepFade 0.28s ease-out",
        "cart-pop": "cartPop 0.32s ease-out",
        "toast-up": "toastUp 0.9s ease-out forwards",
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
        slideInLeft: {
          from: { opacity: "0", transform: "translateX(-10px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        slideInRight: {
          from: { opacity: "0", transform: "translateX(10px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        stepFade: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        cartPop: {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.12)" },
          "100%": { transform: "scale(1)" },
        },
        toastUp: {
          "0%": { opacity: "0", transform: "translate(-50%, 4px)" },
          "20%": { opacity: "1", transform: "translate(-50%, -6px)" },
          "80%": { opacity: "1", transform: "translate(-50%, -16px)" },
          "100%": { opacity: "0", transform: "translate(-50%, -26px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
