// context/ThemeContext.tsx
import {
  DEFAULT_THEME,
  Palette,
  ThemeName,
  palettes,
  radii,
  spacing,
  themeMeta,
  typography,
} from "@/constants/theme";
import { supabase } from "@/lib/supabase/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const CACHE_KEY = "fitcheck.themeName";

interface ThemeContextValue {
  themeName: ThemeName;
  colors: Palette;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  availableThemes: ThemeName[];
  themeMeta: typeof themeMeta;
  setTheme: (name: ThemeName) => Promise<void>;
  isSyncing: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [themeName, setThemeName] = useState<ThemeName>(DEFAULT_THEME);
  const [isSyncing, setIsSyncing] = useState(false);

  // On mount: show cached theme instantly (no flash), then reconcile with
  // the value stored on the user's Supabase profile.
  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (isMounted && cached && cached in palettes) {
          setThemeName(cached as ThemeName);
        }
      } catch {
        // ignore cache read errors, fall through to default
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("Theme")
        .eq("id", user.id)
        .single();

      if (!isMounted || error || !data?.Theme) return;

      const remoteTheme = data.Theme as ThemeName;
      if (remoteTheme in palettes) {
        setThemeName(remoteTheme);
        AsyncStorage.setItem(CACHE_KEY, remoteTheme).catch(() => {});
      }
    };

    hydrate();
    return () => {
      isMounted = false;
    };
  }, []);

  const setTheme = useCallback(async (name: ThemeName) => {
    // Optimistic update so the UI feels instant.
    setThemeName(name);
    AsyncStorage.setItem(CACHE_KEY, name).catch(() => {});

    setIsSyncing(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ Theme: name })
        .eq("id", user.id);

      if (error) throw error;
    } catch (err) {
      console.error("Failed to sync theme preference:", err);
      // Not reverting the optimistic update — local choice still applies,
      // it just may not have synced. It'll retry next time setTheme runs.
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeName,
      colors: palettes[themeName],
      spacing,
      radii,
      typography,
      availableThemes: Object.keys(palettes) as ThemeName[],
      themeMeta,
      setTheme,
      isSyncing,
    }),
    [themeName, isSyncing, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
};
