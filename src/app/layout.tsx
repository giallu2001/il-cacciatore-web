import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Il Cacciatore — Portale venatorio italiano",
  description: "Portale venatorio italiano con calendario, carniere, ATC, meteo, specie, news e documenti.",
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
    ],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
