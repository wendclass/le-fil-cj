import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";
import { ToastProvider } from "@/components/ui/Toast";
import { copy } from "@/lib/copy";

export const metadata: Metadata = {
  title: {
    default: copy.app.name,
    template: `%s | ${copy.app.shortName}`,
  },
  description: `${copy.app.name} — ${copy.app.tagline}`,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/brand/club-cj-logo.png" },
    ],
    apple: [
      { url: "/brand/club-cj-logo.png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#232D6B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-bg text-text antialiased flex flex-col font-body selection:bg-primary/20 selection:text-primary">
        <PwaRegister />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
