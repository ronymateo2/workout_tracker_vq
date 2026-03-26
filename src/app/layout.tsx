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
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
    { media: "(prefers-color-scheme: light)", color: "#F2F2F7" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full" suppressHydrationWarning>
        <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col overflow-x-hidden bg-[var(--background)] sm:shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_4px_48px_rgba(0,0,0,0.12)]">
          {children}
        </div>
      </body>
    </html>
  );
}
