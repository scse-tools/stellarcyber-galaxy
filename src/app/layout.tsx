import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stellar Cyber Galaxy",
  description: "Open case counts by severity across every Stellar Cyber instance you operate.",
};

// Applies the saved theme before paint (no flash). Absent a choice, CSS follows the OS setting.
const THEME_SCRIPT = `try{var t=localStorage.getItem('galaxy.theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="galaxy-backdrop min-h-screen antialiased">{children}</body>
    </html>
  );
}
