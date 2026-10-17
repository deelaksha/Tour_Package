import { BRAND } from "@/lib/config/brand";
import type { Metadata, Viewport } from "next";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description:
    "Scroll through a 3D journey from Bengaluru, across the Western Ghats, to the Karnataka coast and back. Small-group tours with sample itineraries.",
};

export const viewport: Viewport = {
  themeColor: "#07110d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
