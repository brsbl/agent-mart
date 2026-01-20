import type { Metadata } from "next";
import { Inter, Source_Serif_4, IBM_Plex_Mono, JetBrains_Mono } from "next/font/google";
import { NavBar } from "@/components";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
  variable: "--font-ibm",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "Agent Mart - Claude Plugin Marketplace",
  description:
    "Discover and install Claude Code plugins, commands, and skills. Browse plugins from the community.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${sourceSerif.variable} ${ibmPlexMono.variable} ${jetbrainsMono.variable} ${inter.className}`}>
        <NavBar />
        <main>{children}</main>
      </body>
    </html>
  );
}
