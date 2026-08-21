/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Full Circle Agency inspired palette
        navy: {
          50: "#F2F6FA",
          100: "#E2EAF2",
          200: "#C0D2E4",
          300: "#8FAECB",
          400: "#5A85AC",
          500: "#33628E",
          600: "#224A70",
          700: "#183A5A",
          800: "#122C45",
          900: "#0D2033",
        },
        ink: {
          DEFAULT: "#1A2333",
          soft: "#48546A",
          muted: "#7B8698",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          alt: "#F6F8FB",
          line: "#E4E9F0",
        },
        band: {
          critical: "#C2402F",
          criticalBg: "#FCEEEC",
          warn: "#B26E0F",
          warnBg: "#FCF3E3",
          good: "#2F7D46",
          goodBg: "#EAF6EE",
          top: "#1E5FA8",
          topBg: "#EAF2FC",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(13,32,51,0.06), 0 4px 16px rgba(13,32,51,0.06)",
      },
    },
  },
  plugins: [],
};
