// theme.ts
// Design tokens + selectable palettes. Palette choice lives in ThemeContext,
// this file just defines what's available.

export type ThemeName = "light" | "blush" | "sky" | "dark" | "orchid" | "ember";

export interface Palette {
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  accent: string;
  border: string;
  text: string;
  textMuted: string;
  danger: string;
  success: string;
}

export const palettes: Record<ThemeName, Palette> = {
  // ---- Light themes ----
  light: {
    // Clean black/white, magazine-style (formerly "editorial")
    background: "#FFFFFF",
    surface: "#F5F5F5",
    primary: "#111111",
    secondary: "#6B6B6B",
    accent: "#111111",
    border: "#F0F0F0",
    text: "#111111",
    textMuted: "#757575",
    danger: "#D64545",
    success: "#2E9E5B",
  },
  blush: {
    background: "#FBF2EB", // warmer, slightly more peach-leaning cream
    surface: "#F0D4C7", // more saturated dusty terracotta-pink — more separation from background
    primary: "#1C3626", // deeper, more confident forest green — less "dark neutral," more "color"
    secondary: "#7A5240", // warm brown instead of muddy rose-brown — ties to terracotta surface
    accent: "#DB5C6E", // slightly warmer, less pastel pink — more coral-rose than baby pink
    border: "#E2BCA9", // clearly distinct from surface now, adds real definition
    text: "#1C3626",
    textMuted: "#8C6B5C",
    danger: "#A8341F",
    success: "#2F6B45",
  },
  sky: {
    // Airy, soft blue — light and open
    background: "#F6FAFF",
    surface: "#E8F1FC",
    primary: "#1B3A5C",
    secondary: "#5F7A93",
    accent: "#3B82F6",
    border: "#D6E6F7",
    text: "#1B3A5C",
    textMuted: "#6E8299",
    danger: "#D9534F",
    success: "#2FA36B",
  },

  // ---- Dark themes ----
  dark: {
    // Direct grayscale inverse of "light" — no accent color, pure contrast
    background: "#0E0E0E",
    surface: "#1C1C1C",
    primary: "#FFFFFF",
    secondary: "#A0A0A0",
    accent: "#FFFFFF",
    border: "#2B2B2B",
    text: "#F5F5F5",
    textMuted: "#9A9A9A",
    danger: "#FF6B6B",
    success: "#4ADE80",
  },

  orchid: {
    // Deep plum-black, girly dark — rose gold + hot pink accent
    background: "#1A0F17",
    surface: "#2A1620",
    primary: "#F7E6EF",
    secondary: "#C99BB0",
    accent: "#FF5FA2",
    border: "#3D2130",
    text: "#F5E1EC",
    textMuted: "#B98CA6",
    danger: "#FF6B6B",
    success: "#4ADE80",
  },
  ember: {
    // Warm dark, orange-glow accent
    background: "#160F0C",
    surface: "#241814",
    primary: "#F5E6DD",
    secondary: "#C79C87",
    accent: "#FF8A50",
    border: "#3A2620",
    text: "#F5E6DD",
    textMuted: "#C2A292",
    danger: "#FF6B6B",
    success: "#7BC67E",
  },
};

export const themeMeta: Record<ThemeName, { label: string }> = {
  light: { label: "Light" },
  blush: { label: "Blush" },
  sky: { label: "Sky" },
  dark: { label: "Dark" },
  orchid: { label: "Orchid" },
  ember: { label: "Ember" },
};

// ---- Shared tokens (same across all palettes) ----
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radii = {
  sm: 6,
  md: 12,
  lg: 20,
  full: 999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: "700" as const },
  h2: { fontSize: 22, fontWeight: "700" as const },
  h3: { fontSize: 18, fontWeight: "600" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  caption: { fontSize: 12, fontWeight: "400" as const },
};

export const DEFAULT_THEME: ThemeName = "light";
