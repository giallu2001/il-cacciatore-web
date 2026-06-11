import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Il Cacciatore — Portale venatorio italiano",
  description: "Calendari venatori, normative, ATC, meteo, store e scadenze per cacciatori italiani.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
