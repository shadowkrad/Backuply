import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Backuply — QNAP Immutability Vault",
  description: "Disaster Recovery & Backup Immutabile Offsite per Taaaac e Tenant Multi-Modulo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="dark">
      <body className="antialiased bg-[#090d16] text-slate-100 min-h-screen flex flex-col selection:bg-emerald-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
