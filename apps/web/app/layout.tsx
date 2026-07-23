import type { Metadata } from "next";
import { Archivo, Inter, IBM_Plex_Mono } from "next/font/google";
import { AppNav, ThemeScript } from "@upwithagents/ui";
import { PortalChrome } from "./components/PortalChrome";
import "./globals.css";

// Shared @upwithagents/ui design-system fonts (Groundcontrol-light) — its
// theme.css maps --font-display/--font-sans/--font-mono through these
// --app-font-* hooks but doesn't ship the webfonts itself, so this loads them.
const archivo = Archivo({
  variable: "--app-font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const inter = Inter({
  variable: "--app-font-sans",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--app-font-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WalletUp",
  description: "Agentic budgeting assistant — review desk",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${inter.variable} ${plexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col">
        <PortalChrome>
          <AppNav
            links={[
              { href: "/", label: "Dashboard" },
              { href: "/review", label: "Review" },
              { href: "/accounts", label: "Accounts" },
              { href: "/checks", label: "Checks" },
              { href: "/evaluation", label: "Evaluation" },
              { href: "/set-aside", label: "Set-Aside" },
              { href: "/procedures", label: "Procedures" },
              { href: "/todos", label: "Todo" },
              { href: "/tips", label: "Tips" },
              { href: "/mappings", label: "Mappings" },
            ]}
          />
          {children}
        </PortalChrome>
      </body>
    </html>
  );
}
