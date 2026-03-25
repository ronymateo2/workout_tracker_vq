import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://rurana.app"),
  title: {
    default: "Rurana",
    template: "%s | Rurana",
  },
  description:
    "Workout tracker PWA para registrar sesiones, ejercicios dinámicos, bandas, pesas e isométricos.",
  applicationName: "Rurana",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Rurana",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon",
    apple: "/apple-icon",
  },
  openGraph: {
    title: "Rurana",
    description:
      "Bitácora de entrenamiento móvil con Google Auth, Supabase y soporte offline.",
    siteName: "Rurana",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f4f6fb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
