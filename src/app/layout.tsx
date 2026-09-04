import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stellar Cyber Galaxy",
  description: "Open case counts by severity across every Stellar Cyber instance you operate.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="galaxy-backdrop min-h-screen antialiased">{children}</body>
    </html>
  );
}
