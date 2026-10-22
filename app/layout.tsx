import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthShell from "@/components/auth/AuthShell";
import DevServiceWorkerReset from "@/components/app/DevServiceWorkerReset";

export const metadata: Metadata = {
  title: "LS Services | Site Validation",
  description: "Livspace Services Vertical Site Validation App",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LS Services",
  },
};

export const viewport: Viewport = {
  themeColor: "#EB595F",
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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-brand-surface min-h-screen">
        <DevServiceWorkerReset />
        <div className="flex flex-col min-h-screen">
          <AuthShell>{children}</AuthShell>
        </div>
      </body>
    </html>
  );
}
