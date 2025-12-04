const AppColors = {
  primary: {
    50: "#E6F3F7",
    100: "#CCEOEB",
    200: "#99CDEO",
    300: "#66BAD5",
    400: "#33A6CA",
    500: "#0CD3F1",
    600: "#0077A1",
    700: "#006A91",
    800: "#005D80",
    900: "#00506F",
  },
  accent: {
    50: "#E0E0F3",
    100: "#C2C3E7",
    200: "#A3A5DB",
    300: "#8587CF",
    400: "#6669C4",
    500: "#3D3F8F",
    600: '#373981',
    700: "#313374",
    800: "#2B2D66",
    900: "#242659",
  },

  success: "#10B981",
  error: "#EF4444",
  warning: "#F59E0B",

  background: {
    primary: "#071826",           // main background color
    secondary: "#1A2834",         // slightly lighter gray/blue
    tertiary: "#0C1F30",          // mid-tone gray/blue

    quaternary: "#263544",        // stronger contrast
    surface: "#102333",           // cards, sheets
    surfaceSecondary: "#1E2F40",  // for inner surfaces
    elevated: "#2D3E4F",          // elevated surfaces
    border: "#4E5C6B",            // subtle border color
    border2: "#5C6B7B",            // second subtle border color

    overlay: "rgba(255, 255, 255, 0.08)", // soft white overlay
    backdrop: "rgba(0, 0, 0, 0.75)",      // heavy dark modal backdrop

    backbutton: {
      ios: "rgba(255,255,255,0.6)",
      android: "rgba(255,255,255,0.4)"
    }
  },

  text: {
    light: {
      primary: "#FFF",
      secondary: "#9CA3AF",
    },

    dark: {
      primary: "#000",
      secondary: "#5B5B5B",
    },
  },
};

export default AppColors;

export const hexToRGBA = (hex: string, alpha = 1) => {
  const h = hex.replace('#', '');
  const [r, g, b] =
    h.length === 3
      ? [h[0] + h[0], h[1] + h[1], h[2] + h[2]].map((x) => parseInt(x, 16))
      : [h.slice(0, 2), h.slice(2, 4), h.slice(4, 6)].map((x) => parseInt(x, 16));
  return `rgba(${r},${g},${b},${alpha})`;
};