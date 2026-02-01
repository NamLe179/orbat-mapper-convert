"use client";

import { ThemeProvider } from "next-themes";

// This file replaces Vue's main.ts initialization
// Add any global providers here (state management, theme, etc.)
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  );
}
