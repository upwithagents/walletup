import type { Metadata } from "next";
import { Archivo, Inter, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import { ThemeScript } from "@upwithagents/ui";
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
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col">
        <PortalChrome />
        <nav className="mx-auto flex w-full max-w-4xl flex-wrap gap-x-5 gap-y-1 px-4 pt-5 font-mono text-[11px] tracking-[0.18em] uppercase">
          {[
            ["/", "Dashboard"],
            ["/review", "Review"],
            ["/accounts", "Accounts"],
            ["/checks", "Checks"],
            ["/evaluation", "Evaluation"],
            ["/set-aside", "Set-Aside"],
            ["/procedures", "Procedures"],
            ["/todos", "Todo"],
            ["/tips", "Tips"],
            ["/mappings", "Mappings"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="text-ink-soft hover:text-ink">
              {label}
            </Link>
          ))}
        </nav>
        {children}
      </body>
    </html>
  );
}
