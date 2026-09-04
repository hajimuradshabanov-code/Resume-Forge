import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: "ResumeForge — Build a resume that gets noticed", template: "%s · ResumeForge" },
  description:
    "ResumeForge is a modern resume builder with professional templates, live preview, AI-assisted writing, ATS checks and PDF export.",
  applicationName: "ResumeForge",
  openGraph: {
    title: "ResumeForge — Build a resume that gets noticed",
    description: "Professional templates, live preview, AI writing help and PDF export.",
    type: "website",
    siteName: "ResumeForge",
  },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#111827", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster position="bottom-right" richColors closeButton toastOptions={{ duration: 3500 }} />
        </ThemeProvider>
      </body>
    </html>
  );
}
