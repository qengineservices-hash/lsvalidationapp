import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import AuthShell from "@/components/auth/AuthShell";

const inter = Inter({ subsets: ["latin"] });

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
  themeColor: "#FF6B35",
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
      <body className={cn(inter.className, "antialiased bg-livspace-gray-100 min-h-screen")}>
        <div className="flex flex-col min-h-screen">
          <AuthShell>{children}</AuthShell>
        </div>
      </body>
    </html>
  );
}
