// src/context/ThemeContext.js
import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';

// ACTpulse Brand Colors (as specified)
const BRAND_COLORS = {
  light: {
    primary: '#064789',    // main deep blue
    secondary: '#427aa1',  // supporting lighter blue
    accent: '#ebf2fa',     // very light blue (background accents)
  },
  dark: {
    primary: '#3a86b0',    // brighter version of #064789 for dark mode
    secondary: '#6ca3c4',  // adapted from #427aa1
    accent: '#1f3b4c',     // darker accent for dark mode backgrounds
  }
};

// Modern theme configuration extended with brand colors
const THEME_CONFIG = {
  light: {
    name: 'light',
    colors: {
      // Brand colors (directly accessible)
      brand: BRAND_COLORS.light,
      
      // Primary palette (enhanced using brand primary)
      primary: {
        50: '#e6f0f9',   // #064789 tint 10%
        100: '#c2ddf2',  // tint 30%
        200: '#9fcaea',  // tint 50%
        300: '#7bb7e2',  // tint 70%
        400: '#58a4da',  // tint 85%
        500: '#064789',  // base brand primary
        600: '#053b73',  // darken 10%
        700: '#042f5c',  // darken 20%
        800: '#032346',  // darken 30%
        900: '#02172f',  // darken 40%
      },
      // Background colors
      background: {
        primary: '#ffffff',
        secondary: '#f9fafb',
        tertiary: '#f3f4f6',
        inverse: '#111827',
        brandAccent: BRAND_COLORS.light.accent, // #ebf2fa
      },
      // Surface colors (cards, modals, etc.)
      surface: {
        primary: '#ffffff',
        secondary: '#f9fafb',
        tertiary: '#f3f4f6',
      },
      // Text colors
      text: {
        primary: '#111827',
        secondary: '#4b5563',
        tertiary: '#9ca3af',
        inverse: '#ffffff',
      },
      // Border colors
      border: {
        light: '#e5e7eb',
        default: '#d1d5db',
        dark: '#9ca3af',
      },
      // Status colors
      status: {
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#064789', // use brand primary for info
      },
      // Chart colors (starting with brand and secondary)
      chart: [
        '#064789', // brand primary
        '#427aa1', // brand secondary
        '#10b981', // green
        '#f59e0b', // orange
        '#ef4444', // red
        '#8b5cf6', // purple
        '#ec4899', // pink
        '#06b6d4', // cyan
      ],
      // Shadow
      shadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        default: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      },
    },
  },
  dark: {
    name: 'dark',
    colors: {
      // Brand colors (dark mode adapted)
      brand: BRAND_COLORS.dark,
      
      // Primary palette (dark mode, using branded brighter variants)
      primary: {
        50: '#02172f',   // darkest
        100: '#032346',
        200: '#042f5c',
        300: '#053b73',
        400: '#064789',  // base brand
        500: '#3a86b0',  // brighter primary for dark mode
        600: '#6ca3c4',
        700: '#9ec1d8',
        800: '#cfdde9',
        900: '#e6f0f9',
      },
      // Background colors
      background: {
        primary: '#111827',
        secondary: '#1f2937',
        tertiary: '#374151',
        inverse: '#ffffff',
        brandAccent: BRAND_COLORS.dark.accent, // #1f3b4c
      },
      // Surface colors (cards, modals, etc.)
      surface: {
        primary: '#1f2937',
        secondary: '#374151',
        tertiary: '#4b5563',
      },
      // Text colors
      text: {
        primary: '#f9fafb',
        secondary: '#e5e7eb',
        tertiary: '#9ca3af',
        inverse: '#111827',
      },
      // Border colors
      border: {
        light: '#374151',
        default: '#4b5563',
        dark: '#6b7280',
      },
      // Status colors
      status: {
        success: '#34d399',
        warning: '#fbbf24',
        error: '#f87171',
        info: '#3a86b0', // brand primary for dark mode
      },
      // Chart colors (brighter, include brand colors)
      chart: [
        '#3a86b0', // brand primary (dark)
        '#6ca3c4', // brand secondary (dark)
        '#34d399', // green
        '#fbbf24', // orange
        '#f87171', // red
        '#a78bfa', // purple
        '#f472b6', // pink
        '#22d3ee', // cyan
      ],
      // Shadow (adjusted for dark mode)
      shadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
        default: '0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.4)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.4)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.4)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.4), 0 8px 10px -6px rgb(0 0 0 / 0.4)',
      },
    },
  },
};

// Animation presets (unchanged)
export const ANIMATIONS = {
  fadeIn: 'animate-fadeIn',
  slideIn: 'animate-slideIn',
  scaleIn: 'animate-scaleIn',
  bounce: 'animate-bounce',
  pulse: 'animate-pulse',
  spin: 'animate-spin',
};

const ThemeContext = createContext(null);
const THEME_STORAGE_KEY = 'theme';
const LEGACY_THEME_STORAGE_KEY = 'actpulse_theme';

function hasWindow() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function getInitialDarkMode() {
  if (!hasWindow()) {
    return false;
  }

  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
  if (savedTheme) {
    return savedTheme === 'dark';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyThemeTokens(themeConfig, darkMode) {
  if (!hasWindow()) {
    return;
  }

  const root = document.documentElement;
  const { colors } = themeConfig;

  root.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  root.classList.toggle('dark', darkMode);
  root.style.setProperty('--brand-primary', colors.brand.primary);
  root.style.setProperty('--brand-secondary', colors.brand.secondary);
  root.style.setProperty('--brand-accent', colors.brand.accent);
  root.style.setProperty('--color-background', colors.background.primary);
  root.style.setProperty('--color-background-secondary', colors.background.secondary);
  root.style.setProperty('--color-surface', colors.surface.primary);
  root.style.setProperty('--color-surface-secondary', colors.surface.secondary);
  root.style.setProperty('--color-text-primary', colors.text.primary);
  root.style.setProperty('--color-text-secondary', colors.text.secondary);
  root.style.setProperty('--color-text-tertiary', colors.text.tertiary);
  root.style.setProperty('--color-border', colors.border.default);
  root.style.setProperty('--color-border-soft', colors.border.light);
  root.style.setProperty('--color-panel', darkMode ? 'rgba(11, 16, 32, 0.74)' : 'rgba(255, 255, 255, 0.82)');
  root.style.setProperty('--color-panel-strong', darkMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.94)');
  root.style.setProperty('--color-panel-border', darkMode ? 'rgba(126, 165, 191, 0.22)' : 'rgba(6, 71, 137, 0.12)');
  root.style.setProperty('--color-page-bg', darkMode
    ? 'radial-gradient(circle at top left, rgba(6, 71, 137, 0.22), transparent 28%), radial-gradient(circle at top right, rgba(66, 122, 161, 0.16), transparent 22%), linear-gradient(180deg, #020617 0%, #08111f 48%, #0b1224 100%)'
    : 'radial-gradient(circle at top left, rgba(235, 242, 250, 0.95), transparent 24%), radial-gradient(circle at bottom right, rgba(66, 122, 161, 0.14), transparent 24%), linear-gradient(180deg, #f8fbff 0%, #eef5fb 48%, #ffffff 100%)'
  );

  if (darkMode) {
    root.style.colorScheme = 'dark';
  } else {
    root.style.colorScheme = 'light';
  }
}

export function ThemeProvider({ children }) {
  // Initialize theme from localStorage or system preference
  const [darkMode, setDarkMode] = useState(getInitialDarkMode);

  const [mounted, setMounted] = useState(false);
  const [animations, setAnimations] = useState(true);

  // Handle system theme changes
  useEffect(() => {
    if (!hasWindow()) {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      const hasUserTheme = localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
      if (!hasUserTheme) {
        setDarkMode(e.matches);
      }
    };
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Apply theme to document
  useEffect(() => {
    const theme = darkMode ? 'dark' : 'light';

    if (hasWindow()) {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      localStorage.setItem(LEGACY_THEME_STORAGE_KEY, theme);
    }

    applyThemeTokens(darkMode ? THEME_CONFIG.dark : THEME_CONFIG.light, darkMode);
    setMounted(true);
  }, [darkMode]);

  // Toggle theme with smooth transition
  const toggleTheme = useCallback(() => {
    // Add transition class temporarily
    if (!hasWindow()) {
      setDarkMode(prev => !prev);
      return;
    }

    const root = document.documentElement;
    root.classList.add('theme-transition');
    
    setDarkMode(prev => !prev);
    
    // Remove transition class after animation
    setTimeout(() => {
      root.classList.remove('theme-transition');
    }, 300);
  }, []);

  // Set specific theme
  const setTheme = useCallback((theme) => {
    if (theme === 'light' || theme === 'dark') {
      setDarkMode(theme === 'dark');
    }
  }, []);

  // Toggle animations
  const toggleAnimations = useCallback(() => {
    setAnimations(prev => !prev);
  }, []);

  // Get current theme configuration
  const themeConfig = useMemo(
    () => (darkMode ? THEME_CONFIG.dark : THEME_CONFIG.light),
    [darkMode]
  );

  // Memoized context value
  const value = useMemo(
    () => ({
      darkMode,
      mounted,
      animations,
      themeConfig,
      toggleTheme,
      setTheme,
      toggleAnimations,
      // Utility functions
      getColor: (path) => {
        return path.split('.').reduce((obj, key) => obj?.[key], themeConfig.colors);
      },
      getStatusColor: (status) => {
        return themeConfig.colors.status[status] || themeConfig.colors.primary[500];
      },
      getChartColor: (index) => {
        return themeConfig.colors.chart[index % themeConfig.colors.chart.length];
      },
      getShadow: (size = 'default') => {
        return themeConfig.colors.shadow[size];
      },
      // Direct brand color accessors
      getBrandPrimary: () => themeConfig.colors.brand.primary,
      getBrandSecondary: () => themeConfig.colors.brand.secondary,
      getBrandAccent: () => themeConfig.colors.brand.accent,
    }),
    [darkMode, mounted, animations, themeConfig, toggleTheme, setTheme, toggleAnimations]
  );

  return (
    <ThemeContext.Provider value={value}>
      <div style={mounted ? undefined : { visibility: 'hidden' }}>{children}</div>
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within ThemeProvider');
  }
  return context;
}

// Higher-order component for theme injection
export function withTheme(Component) {
  return function WrappedComponent(props) {
    return (
      <ThemeContext.Consumer>
        {(context) => <Component {...props} theme={context} />}
      </ThemeContext.Consumer>
    );
  };
}
