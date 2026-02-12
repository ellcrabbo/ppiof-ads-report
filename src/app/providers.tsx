"use client";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/components/language-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <LanguageProvider>
        <SessionProvider>{children}</SessionProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
