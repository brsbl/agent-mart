import type { Metadata } from "next";
import { NavBar } from "@/components";
import "./globals.css";

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
      <body>
        <NavBar />
        <main>{children}</main>
      </body>
    </html>
  );
}
