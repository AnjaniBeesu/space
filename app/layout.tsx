import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SPACE — Live ISS Tracker",
  description: "Track the International Space Station in real time.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
