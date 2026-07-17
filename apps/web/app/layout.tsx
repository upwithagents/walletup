import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Public_Sans } from "next/font/google";
import Link from "next/link";
import { PortalChrome } from "./components/PortalChrome";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
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
      className={`${fraunces.variable} ${publicSans.variable} ${plexMono.variable} h-full antialiased`}
    >
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
