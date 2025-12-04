/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // --- Primary & Accent Scales ---
        primary: {
          50: "#E6F3F7",
          100: "#CCEOEB",
          200: "#99CDEO",
          300: "#66BAD5",
          400: "#33A6CA",
          500: "#0084B2",
          600: "#0077A1",
          700: "#006A91",
          800: "#005D80",
          900: "#00506F",
        },
        accent: {
          50: "#F2F8E9",
          100: "#E4F1D3",
          200: "#C9E4A8",
          300: "#ADD87E",
          400: "#92CC54",
          500: "#80B733",
          600: "#73A52E",
          700: "#659328",
          800: "#588122",
          900: "#4A6F1D",
        },

        // --- Status Colors ---
        success: "#10B981",
        error: "#EF4444",
        warning: "#F59E0B",

        // --- Flattened Backgrounds and Borders ---
        'bg-light-primary': "#F2F2F2",
        'bg-light-secondary': "#E5E7EB",
        'bg-light-tertiary': "#DDDDDD",
        'bg-light-quaternary': "#EDEDED",
        'bg-light-surface': "#FAFAFA",
        'bg-light-surfaceSecondary': "#F0F0F0",
        'bg-light-elevated': "#F9F9F9",
        'border-light-main': "#94A8B8",
        'border-light-secondary': "#D1D5DB",
        'overlay-light': "rgba(0,0,0,0.04)",
        'backdrop-light': "rgba(0,0,0,0.6)",

        'bg-dark-primary': "#222021",
        'bg-dark-secondary': "#27272A",
        'bg-dark-tertiary': "#1A1819",
        'bg-dark-quaternary': "#333333",
        'bg-dark-surface': "#1A1A1A",
        'bg-dark-surfaceSecondary': "#252525",
        'bg-dark-elevated': "#2E2E2E",
        'border-dark-main': "#3C3C3C",
        'border-dark-secondary': "#374151",
        'overlay-dark': "rgba(255,255,255,0.04)",
        'backdrop-dark': "rgba(0,0,0,0.7)",

        // --- Flattened Text Colors ---
        'text-light-secondary': "#9CA3AF",
        'text-dark-secondary': "#5B5B5B",
      },
      fontFamily: {
        pthin: ["Poppins-Thin", "sans-serif"],
        pextralight: ["Poppins-ExtraLight", "sans-serif"],
        plight: ["Poppins-Light", "sans-serif"],
        pregular: ["Poppins-Regular", "sans-serif"],
        pmedium: ["Poppins-Medium", "sans-serif"],
        psemibold: ["Poppins-SemiBold", "sans-serif"],
        pbold: ["Poppins-Bold", "sans-serif"],
        pextrabold: ["Poppins-ExtraBold", "sans-serif"],
        pblack: ["Poppins-Black", "sans-serif"],
      },
    },
  },
  plugins: [],
};