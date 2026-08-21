/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark navy theme with amber/orange accents.
        // To switch to a pure-black theme, change surface.alt to "#0B0B0D"
        // and surface.DEFAULT to "#141416".
        navy: {
          50: "#16233A",
          100: "#1C2C47",
          200: "#2C4266",
          300: "#3D5C82",
          400: "#5A85AC",
          500: "#33628E",
          600: "#7FA8CE",
          700: "#183A5A",
          800: "#122C45",
          900: "#0D2033",
        },
        accent: {
          DEFAULT: "#F6B93B", // amber — primary accent
          soft: "#FFD070",
          orange: "#ED8733",
          ink: "#221703", // dark text placed on amber fills
        },
        ink: {
          DEFAULT: "#EDF2F8",
          soft: "#BAC6D7",
          muted: "#8093AA",
        },
        surface: {
          DEFAULT: "#111C2E", // card fill
          alt: "#0A1322", // page background
          line: "#25364E",
          raise: "#182740", // slightly lifted panel inside a card
        },
        band: {
          critical: "#F2695C",
          criticalBg: "#3B1512",
          warn: "#F2B33D",
          warnBg: "#3A2A0E",
          good: "#5FCE7E",
          goodBg: "#123020",
          top: "#7FB5F0",
          topBg: "#14263F",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.35), 0 6px 20px rgba(0,0,0,0.30)",
      },
    },
  },
  plugins: [],
};
